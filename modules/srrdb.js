const request = require('request')
const cheerio = require('cheerio')
const legacy = require('legacy-encoding')

const SrrDb = class {
  constructor () {
    this.nfo = (title, callback) => {
      request('https://www.srrdb.com/release/details/' + title, (err, response, body) => {
        if (err) { callback(); return console.error(err) }
        response && console.info('srrdb details statusCode:'.grey, response.statusCode, response.statusMessage.grey)

        const $ = cheerio.load(body)
        if ($('html') === null) { callback(); return console.error('Cheerio failed to load Html') }
        let url = $('.icon-nfo').first().parent().next().attr('href')

        if (url === '' || !url) { return callback() }

        request('https://www.srrdb.com' + url, {encoding: null}, (err, response, body) => {
          if (err) { callback(); return console.error(err) }
          response && console.info('srrdb download statusCode:'.grey, response.statusCode, response.statusMessage.grey)

          let text = legacy.decode(body, 'cp437')
          text = text.replace(/\u0009/g, '')
          callback(text)
        })
      })
    }
  }
}

module.exports = new SrrDb()
