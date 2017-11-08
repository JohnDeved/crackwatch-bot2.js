const text2png = require('text2png')
const imgurUploader = require('imgur-uploader')
const Snoowrap = require('snoowrap')
const Snoostorm = require('snoostorm')
const program = require('commander')
const igdb = require('igdb-api-node').default
const layer13 = require('./modules/layer13')
const srrdb = require('./modules/srrdb')
global.CONFIG = require('./config/cfg.json')

require('console-stamp')(console, {
  pattern: 'dd/mm/yyyy HH:MM:ss.l',
  colors: {
    stamp: 'grey',
    label: 'grey'
  }
})
require('colors')

const r = new Snoowrap(CONFIG.snoowrap['0'])
const rstorm = new Snoostorm(r)
const igdbClient = igdb(CONFIG.igdb.apiKey)

program.version('0.1.0')
.option('-d --debug', 'debug mode')
.option('-t --test', 'test mode')
.parse(process.argv)

if (program.debug) { CONFIG.mode = 'debug' }
r.config({continueAfterRatelimitError: true})

const convertTime = n => {
  n = Number(n)
  var d = (n / 86400).toFixed(2)
  var h = (n / 3600).toFixed(2)
  var m = (n % 3600 / 60).toFixed(2)
  var s = (n % 3600 % 60).toFixed(2)

  if (d > 1) {
    return d + 'days'
  } else if (h > 1) {
    return h + 'hours'
  } else if (m > 1) {
    return m + 'min'
  } else {
    return s + 'sec'
  }
}

const redditText = release => {
  return '#Release Info\n\n----\n\n' +
  `**Release Name**: ${release.title}\n\n` +
  `**Released by**: ${release.group}\n\n` +
  ((() => {
    if (release.scrap13) {
      return (release.scrap13.size ? `**Size**: ${release.scrap13.size.toLowerCase()}\n\n` : '')
    } else {
      return ''
    }
  })()) +
  (release.info13 ? `**Layer13**: ${release.info13.href}\n\n` : '') +
  (release.info13 ? `**srrDB**: https://www.srrdb.com/release/details/${release.title}\n\n` : '') +
  (release.imgur ? `**NFO**: ${release.imgur.link}\n\n` : '') +
  '---\n\n' +
  '&nbsp;\n\n' +
  '#Game Info\n\n----\n\n' +
  (release.os ? `**OS**: ${release.os}\n\n` : '') +
  ((() => {
    if (release.igdb) {
      return (release.igdb.url ? `**Game Name**: ${release.igdb.name}\n\n` : '') +
      (release.igdb.popularity ? `**Popularity**: ${release.igdb.popularity}\n\n` : '') +
      (release.igdb.videos ? `**Video**: [${release.igdb.videos[0].name}](https://www.youtube.com/watch?v=${release.igdb.videos[0].video_id})\n\n` : '') +
      ((() => {
        if (release.scrap13) {
          return (release.scrap13.storehref ? `**Buy**: ${release.scrap13.storehref}\n\n` : '')
        } else {
          return ''
        }
      })()) +
      (release.igdb.url ? `**IGDB**: ${release.igdb.url}\n\n` : '')
    } else {
      if (release.scrap13) {
        return (release.scrap13.storehref ? `**Buy**: ${release.scrap13.storehref}\n\n` : '')
      } else {
        return ''
      }
    }
  })()) +
  '---\n\n' +
  '&nbsp;\n\n' +
  (release.info13 ? `**Benchmark**: u/${release.post.author.name} posted this ${convertTime(release.post.created_utc - release.info13.pretime)} after [pre](https://en.wikipedia.org/wiki/Warez_scene#Release_procedure)!\n\n` : '**Error**: there is no [pre](https://en.wikipedia.org/wiki/Warez_scene#Release_procedure) data available for this Release!\n\n') +
  `^^Post ^^a ^^Release ^^and ^^let ^^me ^^handle ^^the ^^rest ^^| ^^Im ^^a ^^Robot ^^created ^^by ^^u/JustSpeedy ^^| ` +
  `^^[source](https://github.com/JohnDeved/crackwatch-bot2.js) ^^| ^^[old-source](https://github.com/JohnDeved/crackwatch-bot.js)`
}

const checkNfo = (release, count) => {
  let nfodone = release => {
    imgurPost(release, release => {
      if (release.imgur) {
        release.text = redditText(release)
        console.log('Updating Comment'.green, release.submission.id.grey)
        r.getComment(release.submission.id).edit(release.text)
      } else {
        if (count < 30) {
          console.log('No nfo found; retry in 60sec'.red, release.title.grey)

          let text
          text = redditText(release)
          if (release.text !== text) {
            release.text = text
            console.log('Updating Comment'.green, release.submission.id.grey)
            r.getComment(release.submission.id).edit(release.text)
          }
          setTimeout(() => checkNfo(release, ++count), 60 * 1000)
        } else {
          console.log('No nfo found; timeout'.red, release.title.grey)
        }
      }
    })
  }
  console.log(`[${count}] (Re)checking for nfo`.grey, release.title.grey)
  srrdb.nfo(release.title, nfo => {
    release.nfo = nfo
    if (release.info13) {
      layer13.scrap(release.info13.id, scrap13 => {
        release.scrap13 = scrap13
        nfodone(release)
      })
    } else {
      layer13.lookup(release.title, info13 => {
        if (info13) {
          release.info13 = info13
        }
        nfodone(release)
      })
    }
  })
}

const redditPost = release => {
  release.text = redditText(release)
  r.getSubreddit(CONFIG.subreddit[CONFIG.mode])
  r.getSubmission(release.post.id)
  .reply(release.text)
  .then(submission => {
    release.submission = submission
    console.info('Posted on Reddit'.green, release.submission.id.grey)

    if (!release.imgur) {
      setTimeout(() => {
        layer13.lookup(release.title, info13 => {
          release.info13 = info13
          checkNfo(release, 1)
        })
      }, 15 * 1000)
    }
  })
}

const imgurPost = (release, callback) => {
  if (release.nfo) {
    imgurUploader(text2png(release.nfo + `\n\n\n\nnfo image rendered by\nu/JustSpeedy's crackwatch-bot`, CONFIG.text2png), {title: release.title}).then(data => {
      release.imgur = data
      console.info('Posted on Imgur'.green, release.imgur.link.grey)
      callback(release)
    })
  } else {
    if (release.scrap13) {
      if (release.scrap13.nfo !== '') {
        imgurUploader(text2png(release.scrap13.nfo + `\n\n\n\nnfo image rendered by\nJustSpeedy's aka JohnDev's crackwatch-bot`, CONFIG.text2png), {title: release.title}).then(data => {
          release.imgur = data
          console.info('Posted on Imgur'.green, release.imgur.link.grey)
          callback(release)
        })
      } else {
        callback(release)
      }
    } else {
      console.log('skipping Imgur post'.grey, release.title.grey)
      return callback(release)
    }
  }
}

const finalize = release => {
  igdbClient.games({
    search: release.name,
    fields: '*',
    limit: 1
  }).then(response => {
    if (response.body.length !== 0) {
      release.igdb = response.body[0]
      console.log('igdb'.green, release.igdb.url.grey)
      imgurPost(release, redditPost)
    } else {
      console.error('nothing found on igdb'.red, release.name)
    }
  }).catch(error => {
    console.error(error)
    imgurPost(release, redditPost)
  })
}

console.log('Mode:', CONFIG.mode.green, 'Subreddit:', CONFIG.subreddit[CONFIG.mode], 'Reddit-User:', CONFIG.snoowrap['0'].username)

var submissionStream = rstorm.SubmissionStream({
  'subreddit': CONFIG.subreddit[CONFIG.mode],
  'results': 3,
  'pollTime': 2000
})

submissionStream.on('submission', post => {
  console.log('-------------------------------------')
  console.log(post)
  console.log(`${post.author.name}: ${post.title}`.grey)
  r.getSubmission(post.id).comments.then(comments => {
    let botComments = comments.filter(val => val.author.user === CONFIG.snoowrap['0'].username)

    if (botComments.length !== 0) { return console.log('bot allready posted here!'.red) }
    if (/REPACK/i.test(post.title)) { return }
    if (/KaOs/i.test(post.title)) { return }
    if (/FitGirl/i.test(post.title)) { return }
    if (/TWOELV/i.test(post.title)) { return }
    if (/CorePack/i.test(post.title)) { return }
    if (!/(([\d\w._':]+)\b-\b([\d\w._':]+)\b)/.test(post.title)) { return }
    let [, title, name, group] = post.title.match(/(([\d\w._':]+)\b-\b([\d\w._':]+)\b)/)

    let release = {
      title: title,
      name: name,
      post: post,
      group: group.toUpperCase()
    }

    finalize(release)
  })
})
