(function() {
  'use strict';

  /**
   * Initialize a Timesheet
   */
  var Timesheet = function(container, min, max, data) {
    this.data = [];
    this.year = {
      min: min,
      max: max
    };
    this.useMonths = this.year.max - this.year.min < 2;

    this.parse(data || []);

    if (typeof document !== 'undefined') {
      this.container = (typeof container === 'string') ? document.querySelector('#'+container) : container;
      this.drawSections();
      this.insertData();
    }
  };

  /**
   * Insert data into Timesheet
   */
  Timesheet.prototype.insertData = function() {
    var html = [];
    var scaleEl = this.container.querySelector('.scale');
    var sectionEl = this.container.querySelector('.scale section');
    var sectionWidth = sectionEl.offsetWidth;
    var widthMonth = (this.useMonths) ? sectionWidth * 12 : sectionWidth;
    var numSectionsInChart = document.querySelectorAll('.scale section').length;

    this.scaleWidth = (numSectionsInChart * (sectionWidth + 2)).toString() + 'px';
    scaleEl.style.width = this.scaleWidth;

    for (var n = 0, m = this.data.length; n < m; n++) {
      var cur = this.data[n];
      var bubble = this.createBubble(widthMonth, this.useMonths, this.year.min, cur.start, cur.end);

      var line = [
        '<span title="' + Bubble.getStringFromHtml(cur.label) + '" style="margin-left: ' + bubble.getStartOffset(this.firstMonth) + 'px; width: ' + bubble.getWidth() + 'px;" class="bubble bubble-' + (cur.type || 'default') + '" data-duration="' + (cur.end ? Math.round((cur.end-cur.start)/1000/60/60/24/39) : '') + '">',
        // '<span class="date">' + bubble.getDateLabel() + '</span> ',
        '<div class="label">' + cur.label + '</div>',
        '</span>'
      ].join('');

      html.push('<li><div class="bubble-wrapper">' + line + '</div></li>');
    }

    this.container.innerHTML += '<ul class="data">' + html.join('') + '</ul>';
    this.container.querySelector('ul.data').style.width = this.scaleWidth;
  };

  /**
   * Draw section labels
   */
  Timesheet.prototype.drawSections = function() {
    var html = [];

    if (this.useMonths) {
      var numMonths = 0;
      for (var c = this.year.min; c <= this.year.max; c++) {
        var months = this.getFirstAndLastMonth(c);

        for (var m = months.first; m <= months.last; m++) {
          numMonths++;
          var month = m.toString();
          html.push('<section class="month">' + month + '/' + c + '</section>');
        }
      }

      if (numMonths < 12) {
        html = html.map(function(sectionHtml) {
          return sectionHtml.replace('class="month"', 'class="month" style="width: ' + (18 - numMonths).toString() + 'vw"');
        });
      }

    } else {
      for (var y = this.year.min; y <= this.year.max; y++) {
        html.push('<section>' + y + '</section>');
      }
    }

    this.container.className = 'timesheet color-scheme-default';
    this.container.innerHTML = '<div class="scale">' + html.join('') + '</div>';
  };

  Timesheet.prototype.getFirstAndLastMonth = function(currentYear) {
    function getFirstOrLatestMonthInChart(self, which) {
      return function(month, current) {
        var startOrEnd = which === 'first' ? 'start' : 'end';
        var minOrMax = which === 'first' ? 'min' : 'max';
        var thisYear = current[startOrEnd].getFullYear();
        var thisMonth = thisYear === self.year[minOrMax] ? current[startOrEnd].getMonth() : month;
        return Math[minOrMax](month, thisMonth);
      };
    }

    var firstMonth = 1;
    var lastMonth = 12;
    if (currentYear === this.year.min) {
      firstMonth = 1 + this.data.reduce(getFirstOrLatestMonthInChart(this, 'first'), 11);
      this.firstMonth = firstMonth;
    }
    
    if (currentYear === this.year.max) {
      lastMonth = 1 + this.data.reduce(getFirstOrLatestMonthInChart(this, 'last'), 0);
      this.lastMonth = lastMonth;
    }

    return { first: firstMonth, last: lastMonth };
  };

  /**
   * Parse data string
   */
  Timesheet.prototype.parseDate = function(date) {
    var dateParts = date.split('/');
    if (dateParts.length === 1) {
      date = new Date(parseInt(date, 10), 0, 1);
      date.hasMonth = false;
    } else if (dateParts.length === 2) {
      date = new Date(parseInt(dateParts[1], 10), parseInt(dateParts[0], 10)-1, 1);
      date.hasMonth = true;
    } else { // assumed to be MM/DD/YYYY
      date = new Date(parseInt(dateParts[2], 10), parseInt(dateParts[0], 10)-1, parseInt(dateParts[1], 10));
      date.hasMonth = true;
    }

    return date;
  };

  /**
   * Parse passed data
   */
  Timesheet.prototype.parse = function(data) {
    for (var n = 0, m = data.length; n<m; n++) {
      var beg = this.parseDate(data[n][0]);
      var end = data[n].length === 4 ? this.parseDate(data[n][1]) : null;
      var lbl = data[n].length === 4 ? data[n][2] : data[n][1];
      var cat = data[n].length === 4 ? data[n][3] : data[n].length === 3 ? data[n][2] : 'default';

      if (beg.getFullYear() < this.year.min) {
        this.year.min = beg.getFullYear();
      }

      if (end && end.getFullYear() > this.year.max) {
        this.year.max = end.getFullYear();
      } else if (beg.getFullYear() > this.year.max) {
        this.year.max = beg.getFullYear();
      }

      this.data.push({start: beg, end: end, label: lbl, type: cat});
    }
  };

  /**
   * Wrapper for adding bubbles
   */
  Timesheet.prototype.createBubble = function(wMonth, useMonths, min, start, end) {
    return new Bubble(wMonth, useMonths, min, start, end);
  };

  /**
   * Timesheet Bubble
   */
  var Bubble = function(wMonth, useMonths, min, start, end) {
    this.min = min;
    this.start = start;
    this.end = end;
    this.widthMonth = wMonth;
    this.useMonths = useMonths;
  };

  /**
   * Format month number
   */
  Bubble.prototype.formatMonth = function(num) {
    num = parseInt(num, 10);

    return num >= 10 ? num : '0' + num;
  };

  /**
   * Calculate starting offset for bubble
   */
  Bubble.prototype.getStartOffset = function(firstMonthInChart) {
    var monthWidthPixels = this.widthMonth/12;
    var checkAgainstStartMonth = this.useMonths ? this.start.getMonth() - (firstMonthInChart - 1) : this.start.getMonth();
    var monthOffset = monthWidthPixels * (12 * (this.start.getFullYear() - this.min) + checkAgainstStartMonth);
    if (this.useMonths) {
      monthOffset = monthOffset + (monthWidthPixels * (this.start.getDate()/30));
    }
    return monthOffset;
  };

  /**
   * Get count of full years from start to end
   */
  Bubble.prototype.getFullYears = function() {
    return ((this.end && this.end.getFullYear()) || this.start.getFullYear()) - this.start.getFullYear();
  };

  /**
   * Get count of all months in Timesheet Bubble
   */
  Bubble.prototype.getMonths = function() {
    var fullYears = this.getFullYears();
    var months = 0;

    if (!this.end) {
      months += !this.start.hasMonth ? 12 : 1;
    } else {
      if (!this.end.hasMonth) {
        months += 12 - (this.start.hasMonth ? this.start.getMonth() : 0);
        months += 12 * (fullYears-1 > 0 ? fullYears-1 : 0);
      } else {
        months += this.end.getMonth() + 1;
        months += 12 - (this.start.hasMonth ? this.start.getMonth() : 0);
        months += 12 * (fullYears-1);
      }
    }

    return months;
  };

  /**
   * Get bubble's width in pixel
   */
  Bubble.prototype.getWidth = function() {
    var fullMonthsWidth = (this.widthMonth/12) * this.getMonths();
    if (this.useMonths) {
      var monthWidthPixels = this.widthMonth/12;
      var subtractFromStart = monthWidthPixels * (this.start.getDate()/30);
      var subtractFromEnd = monthWidthPixels - (monthWidthPixels * (this.end.getDate()/30));
      fullMonthsWidth = fullMonthsWidth - subtractFromStart - subtractFromEnd;
    }
    return fullMonthsWidth;
  };

  /**
   * Get the bubble's label
   */
  Bubble.prototype.getDateLabel = function() {
    return [
      (this.start.hasMonth ? this.formatMonth(this.start.getMonth() + 1) + '/' : '' ) + this.start.getFullYear(),
      (this.end ? '-' + ((this.end.hasMonth ? this.formatMonth(this.end.getMonth() + 1) + '/' : '' ) + this.end.getFullYear()) : '')
    ].join('');
  };

  /**
   * Use to strip out HTML from label for bubble title
   */
  Bubble.getStringFromHtml = function(htmlString) {
    var html = htmlString || '';
    var div = document.createElement('div');
    div.innerHTML = html;
    var cleanStr = div.textContent || div.innerText || '';
    return cleanStr.replace(/(\r\n|\n)/g, ' ').replace(/\s{2,}/g, ' ');
  };

  window.Timesheet = Timesheet;
})();