const request = require('request')
const cheerio = require('cheerio')
const parseString = require('xml2js').parseString

const PreDb = class {
  constructor () {
    this.checkScrap = callback => {
      request.get({url: 'http://predb.me/?cats=games-pc', headers: CONFIG.headers}, (err, response, body) => {
        if (err) { return console.error(err) }
        response && console.info('predb.me statusCode:'.grey, response.statusCode, response.statusMessage.grey)

        const $ = cheerio.load(body)

        if ($('html') !== null) {
          console.info('Cheerio successfully loaded Html'.grey)
          $('.content .post').each((i, e) => {
            let timeNow = Math.floor(Date.now() / 1000)

            let release = {}
            release.id = $(e).attr('id')
            release.time = parseInt($(e).find('.p-time').attr('data'))
            release.title = $(e).find('.p-title').text()
            release.href = $(e).find('.p-title').attr('href')
            release.age = Math.floor(timeNow - release.time)
            release.group = $(e).find('.t-g').text()

            if (release.age <= CONFIG.timeout && checked.indexOf(release.id) === -1) {
              checked.push(release.id)
              callback(release)
            }
          })
        } else {
          console.error('Cheerio failed to load Html'.red)
        }
      })
    }

    this.checkRss = callback => {
      request.get({url: 'http://predb.me/?cats=games-pc&rss=1', headers: CONFIG.headers}, (err, response, body) => {
        if (err) { return console.error(err) }
        response && console.info('predb.me rss statusCode:'.grey, response.statusCode, response.statusMessage.grey)

        parseString(body, (err, result) => {
          if (err) { return console.error(err) }

          callback(result)
        })
      })
    }

    this.info = (id, callback) => {
      request.get({url: `http://predb.me/?post=${id}&jsload=1`, headers: CONFIG.headers}, (err, response, body) => {
        if (err) { return console.error(err) }
        response && console.info('predb.me jsload statusCode:'.grey, response.statusCode, response.statusMessage.grey)

        const $ = cheerio.load(body)
        let info = {}
        info.Rlsname = $('.pb-c:contains(Rlsname)').next().text()
        info.group = $('.pb-c:contains(Group)').next().text()
        info.size = $('.pb-c:contains(Size)').next().text()
        info.genres = $('.pb-c:contains(Genres)').next().text()
        info.tags = $('.pb-c:contains(Tags)').next().text()

        console.info('predb.me size:'.grey, info.size.grey)
        callback(info)
      })
    }
  }
}

module.exports = new PreDb()
