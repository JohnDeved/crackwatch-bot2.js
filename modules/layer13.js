const request = require('request')
const cheerio = require('cheerio')

const Layer13 = class {
  constructor () {
    this.lookup = (title, callback) => {
      request.get(`http://api.layer13.net/v1/?getpre=${title}&key=${CONFIG.layer13.apiKey}`, (err, response, body) => {
        if (err) { callback(); return console.error(err) }
        response && console.info('layer13 getpre statusCode:'.grey, response.statusCode, response.statusMessage.grey)
        if (!/{.+}/.test(body)) { callback(); return console.error('no json?'.red) }
        body = body.match(/{.+}/)[0]
        let data
        try {
          data = JSON.parse(body)
        } catch (error) {
          callback(); return console.log(error)
        }
        if (data.error) { callback(); return console.error(data) }
        data.href = `https://layer13.net/rls?id=${data.id}`
        callback(data)
      })
    }

    this.scrap = (id, callback) => {
      request.get(`https://layer13.net/rls?id=${id}`, (err, response, body) => {
        if (err) { callback(); return console.error(err) }
        response && console.info('layer13 rlspage statusCode:'.grey, response.statusCode, response.statusMessage.grey)

        const $ = cheerio.load(body)
        if ($('html') === null) { callback(); return console.error('Cheerio failed to load Html') }

        let scrap = {}
        let a = $('.page-header h6').next()
        if (/anonym\.to/i.test(a.attr('href'))) {
          scrap.storehref = a.attr('href').match(/http:\/\/anonym\.to\/\?(.+)/i)[1]
          console.info('layer13 store:'.grey, scrap.storehref.grey)

          if (/steampowered\.com\/app\//i.test(scrap.storehref)) {
            scrap.steamid = scrap.storehref.match(/\/app\/(\d+)/)[1]
          }
        }
        let header = $('.page-header h6').html()
        if (/(.+?)<br>/.test(header)) {
          header = header.match(/(.+?)<br>/)[1]
          if (/With (.+)/.test(header)) {
            scrap.size = header.match(/With (.+)/)[1]
            console.info('layer13 size:'.grey, scrap.size.grey)
          }
        }
        scrap.nfo = $('pre.nfo').first().text()
        callback(scrap)
      })
    }

    this.listfiles = (id, callback) => {
      request.get(`http://api.layer13.net/v1//?listfiles=${id}&key=${CONFIG.layer13.apiKey}`, (err, response, body) => {
        if (err) { return console.error(err) }
        response && console.info('layer13 listfiles statusCode:'.grey, response.statusCode, response.statusMessage.grey)
        if (/{.+}/.test(body)) { console.error('no json?'.red) }
        body = body.match(/{.+}/)[0]
        let data
        try {
          data = JSON.parse(body)
        } catch (error) {
          return console.log(error)
        }
        if (data.error) { return console.error(data) }
        callback(data)
      })
    }

    this.getfile = (id, filename, callback) => {
      request.get(`http://api.layer13.net/v1//?getfile=${id}&filename=${filename}&key=${CONFIG.layer13.apiKey}`, (err, response, body) => {
        if (err) { return console.error(err) }
        response && console.info('layer13 getfile statusCode:'.grey, response.statusCode, response.statusMessage.grey)
        callback(body)
      })
    }

    this.getfilessize = (id, filename, callback) => {
      request.get(`http://api.layer13.net/v1//?getfilessize=${id}&key=${CONFIG.layer13.apiKey}`, (err, response, body) => {
        if (err) { return console.error(err) }
        response && console.info('layer13 getfile statusCode:'.grey, response.statusCode, response.statusMessage.grey)
        callback(body)
      })
    }
  }
}

module.exports = new Layer13()
