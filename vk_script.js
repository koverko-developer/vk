var querystring = require('querystring');
var https = require('https');
var iconv = require('iconv-lite');

var my_id = '185645054';

var COOKIE = 'remixlang=0; remixstid=174780143_8f08d9b6cecc032d5b; remixflash=0.0.0; remixscreen_depth=24; remixdt=0; remixttpid=da52df1d140a2a76ab14e8be1b9adea7d54a1e6835; remixmdevice=1366/768/1/!!-!!!!; remixseenads=0; remixrefkey=d1fb7610a21ed037de; remixgp=55e4345b0f6326e4e5d01b97afeffe5c; remixsid=1f35501c4d43f017da5babadf5f3536d6dbd9286a02e45c08b40c; tmr_detect=0%7C1524551015924; remixcurr_audio=185645054_456239119';
var USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36';

function httpsRequest(params, postData) {
    return new Promise(function (resolve, reject) {
        var req = https.request(params, function (res) {
            // reject on bad status
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error('statusCode=' + res.statusCode));
            }
            // cumulate data
            var body = [];
            res.on('data', function (chunk) {
                body.push(chunk);
            });
            // resolve on end
            res.on('end', function () {
                try {
                    body = Buffer.concat(body);
                } catch (e) {
                    reject(e);
                }
                resolve(body);
            });
        });
        // reject on request error
        req.on('error', function (err) {
            // This is not a "Second reject", just a different sort of failure
            reject(err);
        });
        if (postData) {
            req.write(postData);
        }
        // IMPORTANT
        req.end();
    });
}

var r = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN0PQRSTUVWXYZO123456789+/=",
  l = {
    v: function(t) {
      return t.split("").reverse().join("")
    },
    r: function(t, e) {
      t = t.split("");
      for (var i, o = r + r, a = t.length; a--;)
        i = o.indexOf(t[a]), ~i && (t[a] = o.substr(i - e, 1));
      return t.join("")
    },
    s: function(t, e) {
      var i = t.length;
      if (i) {
        var o = s(t, e),
          a = 0;
        for (t = t.split(""); ++a < i;)
          t[a] = t.splice(o[i - 1 - a], 1, t[a])[0];
        t = t.join("")
      }
      return t
    },
    i: function(t, e) {
      return l.s(t, e ^ my_id)
    },
    x: function(t, e) {
      var i = [];
      return e = e.charCodeAt(0),
        each(t.split(""), function(t, o) {
          i.push(String.fromCharCode(o.charCodeAt(0) ^ e))
        }),
        i.join("")
    }
  }

function getRealLink(t) {
  if ( ~t.indexOf("audio_api_unavailable")) {
    var e = t.split("?extra=")[1].split("#"),
      o = "" === e[1] ? "" : a(e[1]);
    if (e = a(e[0]),
      "string" != typeof o || !e)
      return t;
    o = o ? o.split(String.fromCharCode(9)) : [];
    for (var s, r, n = o.length; n--;) {
      if (r = o[n].split(String.fromCharCode(11)),
        s = r.splice(0, 1, e)[0], !l[s])
        return t;
      e = l[s].apply(null, r)
    }
    if (e && "http" === e.substr(0, 4))
      return e
  }
  return t
}

function a(t) {
  if (!t || t.length % 4 == 1)
    return !1;
  for (var e, i, o = 0, a = 0, s = ""; i = t.charAt(a++);)
    i = r.indexOf(i), ~i && (e = o % 4 ? 64 * e + i : i,
      o++ % 4) && (s += String.fromCharCode(255 & e >> (-2 * o & 6)));
  return s
}

function s(t, e) {
  var i = t.length,
    o = [];
  if (i) {
    var a = i;
    for (e = Math.abs(e); a--;)
      e = (i * (a + 1) ^ e + a) % i,
      o[a] = e
  }
  return o
}

async function audio_api(payload, callback) {
    // Build the post string from an object

    var post_data = querystring.stringify(
        payload
    );
    console.log(post_data);

    var post_options = {
        host: 'vk.com',
        scheme: 'https',
        port: '443',
        path: '/al_audio.php',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(post_data),
            'Cookie': COOKIE,
            'user-agent': USER_AGENT
        }
    };
    let result = await httpsRequest(post_options, post_data);
    return result;
}

function parseJSONList(x) {
    return {
        'track_id': x[0],
        'user_id': x[1],
        'src': x[2],
        'title': x[3],
        'author': x[4]
    }
}

async function buildPlaylist() {
    let playlist = []
    let pd = {
        'al': 1,
        'act': 'load_section',
        'owner_id': my_id,
        'type': 'playlist',
        'playlist_id': '-1',
        'offset': 0
    }
    let res = await audio_api(pd);
    res = prepare(res);
    list = res.list.map(x => {
        return {
            'track_id': x[0],
            'user_id': x[1],
            'src': x[2],
            'title': x[3],
            'author': x[4]
        }
    })
    playlist = list;

    while (res.hasMore != 0) {
        pd.offset = res.nextOffset;
        res = await audio_api(pd);
        res = prepare(res);
        list = res.list.map(parseJSONList);
        playlist = playlist.concat(list);
    }
    console.log(playlist.length);
    getSources(playlist);
}

async function getSources(playlist) {
    console.log('getting sources');

    let pd = {
        'act': 'reload_audio',
        'al': '1',
        'ids': ''
    }

    let ids = [];
    playlist.forEach((val, index, arr) => {
        if (!val.src)
            ids.push(`${val.user_id}_${val.track_id}`);
    })

    playlist = playlist.filter(x => {
        if (x.src)
            return true;
        else {
            return false;
        }
    })
    for (let i = 0; i * 9 < ids.length; i++) {
        console.log(`\n ON ITERATION ${i}. from ${9*i} to ${9*(i+1)} \n`);
        pd.ids = ids.slice(9 * i, 9 * (i + 1))
            .join();
        try {
            res = await audio_api(pd);
        } catch (e) {
            console.log(e);
        }
        res = prepare(res)
            .map(parseJSONList);
        console.log(res.length);
        playlist = playlist.concat(res);
    }
    console.log(playlist.length);
    console.log(getRealLink(playlist[0].src))
}

function prepare(data) {
    let res = iconv.decode(data, 'win1251');
    let json_data = res.split('<!>')[5];
    json_data = JSON.parse(json_data.slice(7));
    return json_data;
}

buildPlaylist();
