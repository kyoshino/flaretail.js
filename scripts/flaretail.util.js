/**
 * FlareTail Utility Functions
 * Copyright © 2014 Kohei Yoshino. All rights reserved.
 */

'use strict';

let FlareTail = FlareTail || {};
FlareTail.util = {};

/* ----------------------------------------------------------------------------------------------
 * Event
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.event = {};

FlareTail.util.event.set_keybind = function ($target, key, modifiers, command) {
  $target.addEventListener('keydown', event => {
    // Check the key code
    if (event.keyCode !== event['DOM_VK_' + key]) {
      return;
    }

    // Check modifier keys
    modifiers = modifiers ? modifiers.split(',') : [];

    for (let mod of ['shift', 'ctrl', 'meta', 'alt']) {
      if ((modifiers.indexOf(mod) > -1 && !event[mod + 'Key']) ||
          (modifiers.indexOf(mod) === -1 && event[mod + 'Key'])) {
        return;
      }
    }

    // Execute command
    command(event);
  });
};

FlareTail.util.event.ignore = event => {
  event.preventDefault();
  event.stopPropagation();

  return false;
};

// This function allows to set multiple event listeners as once
FlareTail.util.event.bind = function (that, $target, types, use_capture = false, unbind = false) {
  if (!$target) {
    return false;
  }

  for (let type of types) {
    if (!that['on' + type]) {
      continue; // No such handler
    }

    unbind ? $target.removeEventListener(type, that, use_capture)
           : $target.addEventListener(type, that, use_capture);
  }

  return true;
};

FlareTail.util.event.unbind = function (that, $target, types, use_capture = false) {
  this.bind(that, $target, types, use_capture, true);
};

// Async event handling using postMessage
FlareTail.util.event.async = function (callback) {
  if (this.queue === undefined) {
    this.queue = [];

    window.addEventListener('message', event => {
      if (event.source === window && event.data === 'AsyncEvent' && this.queue.length) {
        this.queue.shift().call();
      }
    });
  }

  this.queue.push(callback);
  window.postMessage('AsyncEvent', location.origin);
};

// Custom event dispatcher. The async option is enabled by default
FlareTail.util.event.dispatch = function ($target, type, options = {}, async = true) {
  let callback = () => {
    $target.dispatchEvent(new CustomEvent(type, options));
  };

  async ? this.async(callback) : callback();
};

/* ----------------------------------------------------------------------------------------------
 * Request
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.request = {};

FlareTail.util.request.build_query = function (query) {
  let fields = new Set();

  for (let [key, value] of Iterator(query)) {
    for (let val of (Array.isArray(value) ? value : [value])) {
      fields.add(encodeURIComponent(key) + '=' + encodeURIComponent(val));
    }
  }

  return '?' + [...fields].join('&');
};

FlareTail.util.request.parse_query_str = function (str, casting = true) {
  let query = new Map();

  for ([k, v] of [q.split('=') for (q of str.split('&'))]) {
    let arr = false,
        key = decodeURIComponent(k).replace(/\[\]$/, () => {
          arr = true; // The value should be an array when the key is a string like 'component[]'
          return '';
        }),
        value = decodeURIComponent(v).replace(/\+/g, ' '),
        _value = query.get(key); // Existing value

    if (casting) {
      if (value === 'true') {
        value = true; // Convert to Boolean
      }

      if (value === 'false') {
        value = false; // Convert to Boolean
      }

      if (!Number.isNaN(value)) {
        value = Number.parseFloat(value); // Convert to Number
      }
    }

    if (_value) {
      _value = Array.isArray(_value) ? _value : [_value];
      _value.push(value);
    } else {
      _value = arr ? [value] : value;
    }

    query.set(key, _value);
  }

  return query;
};

/* ----------------------------------------------------------------------------------------------
 * Preferences
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.prefs = {};

/* ----------------------------------------------------------------------------------------------
 * Storage
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.Storage = function () {
  let req = this.request = indexedDB.open('MyTestDatabase', 1),
      db = this.db = null;

  req.addEventListener('error', event => {});
  req.addEventListener('success', event => db = request.result);
  db.addEventListener('error', event => {});
};

/* ----------------------------------------------------------------------------------------------
 * Device
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.device = {
  touch: {
    enabled: window.matchMedia('(-moz-touch-enabled: 1)').matches
  }
};

let (ua = navigator.userAgent, device = FlareTail.util.device) {
  // A device form factor
  // https://developer.mozilla.org/en-US/docs/Gecko_user_agent_string_reference
  if (ua.contains('Tablet')) {
    device.type = 'mobile-tablet';
  } else if (ua.contains('Mobile')) {
    device.type = 'mobile-phone';
  } else {
    device.type = 'desktop';
  }

  document.documentElement.setAttribute('data-device-type', device.type);
}

/* ----------------------------------------------------------------------------------------------
 * App
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.app = {};

FlareTail.util.app.can_install = function (manifest, callback) {
  let apps = navigator.mozApps;

  if (!apps) {
    callback(false);
    return;
  }

  let request = apps.checkInstalled(manifest);
  request.addEventListener('success', event => {
    callback(!request.result);
  });
  request.addEventListener('error', event => callback(false));
};

FlareTail.util.app.install = function (manifest, callback) {
  let request = navigator.mozApps.install(manifest);
  request.addEventListener('success', event => callback(event));
  request.addEventListener('error', event => callback(event));
};

FlareTail.util.app.fullscreen_enabled = function () {
  return document.fullscreenEnabled || document.mozFullScreenEnabled;
};

FlareTail.util.app.toggle_fullscreen = function () {
  if (document.fullscreenElement === null || document.mozFullScreenElement === null) {
    if (document.body.requestFullscreen) {
      document.body.requestFullscreen();
    } else if (document.body.mozRequestFullScreen) {
      document.body.mozRequestFullScreen();
    }
  } else {
    if (document.cancelFullScreen) {
      document.cancelFullScreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    }
  }
};

FlareTail.util.app.auth_notification = function () {
  Notification.requestPermission(permission => {});
};

FlareTail.util.app.show_notification = function (title, options = {}) {
  new Notification(title, {
    dir: options.dir || 'auto',
    lang: options.lang || 'en-US',
    body: options.body || '',
    tag: options.tag || '',
    icon: options.icon || ''
  });
};

/* ----------------------------------------------------------------------------------------------
 * Theme
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.theme = {};

Object.defineProperties(FlareTail.util.theme, {
  'list': {
    enumerable : true,
    get: () => document.styleSheetSets
  },
  'default': {
    enumerable : true,
    get: () => document.preferredStyleSheetSet
  },
  'selected': {
    enumerable : true,
    get: () => document.selectedStyleSheetSet,
    set: name => document.selectedStyleSheetSet = name
  }
});

FlareTail.util.theme.preload_images = function (callback) {
  let pattern = 'url\\("(.+?)"\\)',
      images = new Set();

  for (let [i, sheet] of Iterator(document.styleSheets)) {
    for (let [i, rule] of Iterator(sheet.cssRules)) {
      let match = rule.style && rule.style.backgroundImage &&
                  rule.style.backgroundImage.match(RegExp(pattern, 'g'));

      if (!match) {
        continue;
      }

      // Support for multiple background
      for (let m of match) {
        let src = m.match(RegExp(pattern))[1];

        if (!images.has(src)) {
          images.add(src);
        }
      }
    }
  }

  let total = images.size,
      loaded = 0;

  for (let src of images) {
    let image = new Image();
    image.addEventListener('load', event => {
      loaded++;
      if (loaded === total) {
        callback();
      }
    });
    image.src = src;
  }
};

/* ----------------------------------------------------------------------------------------------
 * Network
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.network = {};

/* ----------------------------------------------------------------------------------------------
 * History
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.history = {};

/* ----------------------------------------------------------------------------------------------
 * Localization
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.l10n = {};

/* ----------------------------------------------------------------------------------------------
 * Internationalization
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.i18n = {};

FlareTail.util.i18n.options = {
  date: {
    timezone: 'local',
    format: 'relative'
  }
};

FlareTail.util.i18n.format_date = function (str, simple = false) {
  let timezone = this.options.date.timezone,
      format = this.options.date.format,
      now = new Date(),
      date = new Date(str),
      shifted_date,
      dst = Math.max((new Date(date.getFullYear(), 0, 1)).getTimezoneOffset(),
        (new Date(date.getFullYear(), 6, 1)).getTimezoneOffset()) > date.getTimezoneOffset();

  // TODO: We can soon use the ECMAScript Intl API
  // https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString

  // Timezone conversion
  if (timezone !== 'local') {
    let utc = date.getTime() + (date.getTimezoneOffset() + (dst ? 60 : 0)) * 60000,
        offset = timezone === 'PST' ? 3600000 * (dst ? -7 : -8) : 0;
    shifted_date = new Date(utc + offset);
  }

  // Relative dates
  if (format === 'relative') {
    if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
      if (date.getDate() === now.getDate()) {
        return (shifted_date || date).toLocaleFormat(simple ? '%R' : 'Today %R');
      }

      if (date.getDate() === now.getDate() - 1) {
        return (shifted_date || date).toLocaleFormat(simple ? 'Yesterday' : 'Yesterday %R');
      }
    }
  }

  return (shifted_date || date).toLocaleFormat(simple ? '%b %e' : '%Y-%m-%d %R');
};

/* ----------------------------------------------------------------------------------------------
 * Style
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.style = {};

FlareTail.util.style.get = ($element, property) => {
  return window.getComputedStyle($element, null).getPropertyValue(property);
};

/* ----------------------------------------------------------------------------------------------
 * Object
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.object = {};

FlareTail.util.object.clone = obj => JSON.parse(JSON.stringify(obj));

/* ----------------------------------------------------------------------------------------------
 * Array
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.array = {};

FlareTail.util.array.clone = array => [...array];

/* ----------------------------------------------------------------------------------------------
 * String
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.string = {};

FlareTail.util.string.sanitize = str => {
  let chars = new Map(Iterator({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;'
  }));

  return str.replace(/./g, match => chars.get(match) || match);
};
