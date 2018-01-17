var Waveform,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

Waveform = (function() {
  'use strict';
  var BUS_SIGNAL, CANVAS_MAX_HEIGHT, DEFAULT_COLOR, DEFAULT_OPACITY, GRID_SECTIONS, RADIX_BIN, RADIX_DEC, RADIX_HEX, RULER_HEIGHT, SIGNAL_BOX_HEIGHT, SIGNAL_BOX_PADDING, SIGNAL_BOX_WIDTH, SIGNAL_BUS_SLOPE, SIGNAL_HEIGHT, SIGNAL_NAMES_BOX_WIDTH, SIGNAL_NAME_WIDTH, WIRE_SIGNAL;

  RULER_HEIGHT = 14;

  GRID_SECTIONS = 11;

  SIGNAL_NAMES_BOX_WIDTH = 220;

  SIGNAL_NAME_WIDTH = 150;

  SIGNAL_BOX_HEIGHT = 20;

  SIGNAL_BOX_WIDTH = 160;

  SIGNAL_BOX_PADDING = 8;

  SIGNAL_HEIGHT = 20;

  SIGNAL_BUS_SLOPE = 3;

  WIRE_SIGNAL = 0;

  BUS_SIGNAL = 1;

  RADIX_BIN = 0;

  RADIX_DEC = 1;

  RADIX_HEX = 2;

  CANVAS_MAX_HEIGHT = 3000;

  DEFAULT_COLOR = {
    CANVAS_BACKGROUND: 'black',
    CURSOR: 'rgb(64, 186, 255)',
    GRID_TEXT: 'gray',
    SIGNAL: 'rgb(8, 255, 40)',
    SIGNAL_NAME_RECT: 'gray',
    SIGNAL_HIGHLIGHT: 'rgb(97, 255, 0)',
    SIGNAL_DC: 'red',
    SIGNAL_IMPED: 'blue',
    SIGNAL_DRAGGED: 'rgb(197, 255, 145)',
    GRID_LINE: 'gray',
    SIGNAL_NAME: 'white',
    SIGNAL_VALUE: 'white',
    SIGNAL_CURRENT_VALUE: 'white',
    CURRENT_VALUE_LINE: 'white'
  };

  DEFAULT_OPACITY = {
    CURSOR: 1.0,
    SIGNAL_NAME_RECT: 0.2,
    SIGNAL_HIGHLIGHT: 0.3,
    SIGNAL_DRAGGED: 0.3
  };

  function Waveform(_containerId, _data, _initDiagram) {
    var busSignal, depth, e, index, j, k, l, len, len1, len2, len3, len4, len5, len6, levels, m, n, o, p, ref, ref1, ref2, ref3, ref4, ref5, ref6, signal, signalId, signalIndex, signalMap;
    this._containerId = _containerId;
    this._data = _data;
    this._initDiagram = _initDiagram;
    this._container = $("#" + this._containerId);
    if (!this._container.length) {
      return null;
    }
    if (typeof this._initDiagram === 'string') {
      try {
        this._initDiagram = JSON.parse(this._initDiagram);
      } catch (_error) {
        e = _error;
        this._initDiagram = null;
      }
    }
    this.timeScale = this._data.scale.match(/(\d+)/);
    this.timeScaleUnit = this._data.scale.match(/(\D+)/);
    if ((this.timeScale == null) || !this.timeScaleUnit) {
      return null;
    }
    this.timeScale = this.timeScale[0];
    this.timeScaleUnit = this.timeScaleUnit[0];
    this.timeUnit = parseInt(this.timeScale);
    if (this.timeScaleUnit === 'ns') {
      this.timeUnit *= 1000;
    }
    this.radix = RADIX_BIN;
    this.originalEndTime = this._data.endtime;
    this.endTime = this.ceilFive(this.originalEndTime);
    this.renderFrom = 0;
    if (this.originalEndTime > 100) {
      this.renderTo = this.floorInt(this.endTime, 100);
    } else {
      this.renderTo = this.roundInt(this.endTime / 2.0, 10);
    }
    this.signals = this._data.signal;
    this._onChangeListener = void 0;
    this._onSaveListener = void 0;
    if (this._initDiagram != null) {
      if (this._initDiagram.from != null) {
        this.renderFrom = this._initDiagram.from;
      }
      if (this._initDiagram.to != null) {
        this.renderTo = this._initDiagram.to;
      }
      if (this._initDiagram.end != null) {
        this.endTime = this._initDiagram.end;
      }
      if (this._initDiagram.originalEnd != null) {
        this.originalEndTime = this._initDiagram.originalEnd;
      }
      if (this._initDiagram.timeScale != null) {
        this.timeScale = this._initDiagram.timeScale;
      }
      if (this._initDiagram.timeScaleUnit != null) {
        this.timeScale = this._initDiagram.timeScaleUnit;
      }
      if (this._initDiagram.timeUnit != null) {
        this.timeUnit = this._initDiagram.timeUnit;
      }
      if ((this._initDiagram.cursor != null) && (this._initDiagram.cursorExact != null)) {
        this.currentTime = this._initDiagram.cursor;
        this.currentExactTime = this._initDiagram.cursorExact;
      }
    }
    ref = this.signals;
    for (j = 0, len = ref.length; j < len; j++) {
      signal = ref[j];
      signal.originalName = signal.name;
    }
    if (!((this._initDiagram != null) && (this._initDiagram.from != null) && (this._initDiagram.to != null))) {
      this.renderedSignals = [];
      this.removedSignals = [];
      this.includedSignals = [];
      this.excludedSignals = [];
      ref1 = this.signals;
      for (k = 0, len1 = ref1.length; k < len1; k++) {
        signal = ref1[k];
        if (!(typeof signal.name === 'string' || signal.name.trim() === '')) {
          continue;
        }
        levels = signal.name.split('.');
        depth = levels.length;
        signalId = signal.name;
        if (depth > 1) {
          levels.splice(0, 1);
        }
        signal.name = levels.join('.');
        busSignal = this.isBus(signal.name);
        if (depth === 2) {
          if (indexOf.call(this.includedSignals, signalId) < 0) {
            this.renderedSignals.push({
              id: signalId,
              signal: signal,
              text: null,
              ypos: null,
              currentValue: '0',
              type: busSignal ? BUS_SIGNAL : WIRE_SIGNAL,
              width: busSignal ? Math.abs(busSignal.start - busSignal.end) + 1 : 1
            });
            this.includedSignals.push(signalId);
          }
        } else if (depth > 2) {
          if (indexOf.call(this.excludedSignals, signalId) < 0) {
            this.removedSignals.push({
              id: signalId,
              signal: signal,
              text: null,
              ypos: null,
              currentValue: '0',
              type: busSignal ? BUS_SIGNAL : WIRE_SIGNAL,
              width: busSignal ? Math.abs(busSignal.start - busSignal.end) + 1 : 1
            });
            this.excludedSignals.push(signalId);
          }
        }
      }
    } else {
      signalMap = {};
      this.renderedSignals = [];
      this.removedSignals = [];
      this.includedSignals = [];
      this.excludedSignals = [];
      ref2 = this._initDiagram.rendered;
      for (l = 0, len2 = ref2.length; l < len2; l++) {
        index = ref2[l];
        if (indexOf.call(this.includedSignals, index) < 0) {
          this.includedSignals.push(index);
        }
      }
      ref3 = this._initDiagram.hidden;
      for (m = 0, len3 = ref3.length; m < len3; m++) {
        index = ref3[m];
        if (indexOf.call(this.excludedSignals, index) < 0) {
          this.excludedSignals.push(index);
        }
      }
      this._initDiagram.rendered = (function() {
        var len4, n, ref4, results;
        ref4 = this.includedSignals;
        results = [];
        for (n = 0, len4 = ref4.length; n < len4; n++) {
          index = ref4[n];
          results.push(index);
        }
        return results;
      }).call(this);
      this._initDiagram.hidden = (function() {
        var len4, n, ref4, results;
        ref4 = this.excludedSignals;
        results = [];
        for (n = 0, len4 = ref4.length; n < len4; n++) {
          index = ref4[n];
          results.push(index);
        }
        return results;
      }).call(this);
      ref4 = this.signals;
      for (n = 0, len4 = ref4.length; n < len4; n++) {
        signal = ref4[n];
        if (!(typeof signal.name === 'string' || signal.name.trim() === '')) {
          continue;
        }
        levels = signal.name.split('.');
        depth = levels.length;
        signalId = signal.name;
        if (depth > 1) {
          levels.splice(0, 1);
        }
        signal.name = levels.join('.');
        busSignal = this.isBus(signal.name);
        signalMap[signalId] = {
          id: signalId,
          signal: signal,
          text: null,
          ypos: null,
          currentValue: '0',
          type: busSignal ? BUS_SIGNAL : WIRE_SIGNAL,
          width: busSignal ? Math.abs(busSignal.start - busSignal.end) + 1 : 1
        };
      }
      ref5 = this._initDiagram.rendered;
      for (o = 0, len5 = ref5.length; o < len5; o++) {
        signalIndex = ref5[o];
        this.renderedSignals.push(signalMap[signalIndex]);
      }
      ref6 = this._initDiagram.hidden;
      for (p = 0, len6 = ref6.length; p < len6; p++) {
        signalIndex = ref6[p];
        this.removedSignals.push(signalMap[signalIndex]);
      }
      if (typeof this._initDiagram.highlightedIndex === 'number' && this._initDiagram.highlightedIndex < this.renderedSignals.length) {
        this.highlightedIndex = this._initDiagram.highlightedIndex;
      }
    }
    this._initLayout();
    this._initCanvas();
    this.redraw();
    if ((this._initDiagram != null) && (this._initDiagram.cursor != null) && (this._initDiagram.cursorExact != null)) {
      this.setCursorTime(this.currentExactTime);
    }
    if ((this._initDiagram != null) && (this._initDiagram.radix != null)) {
      if (this._initDiagram.radix === RADIX_BIN) {
        $("#" + this._radixSelectId).val("" + this._radixSelectBinId).selectmenu('refresh');
        this.radix = RADIX_BIN;
        this.setRadix(RADIX_BIN);
      } else if (this._initDiagram.radix === RADIX_HEX) {
        $("#" + this._radixSelectId).val("" + this._radixSelectHexId).selectmenu('refresh');
        this.radix = RADIX_HEX;
        this.setRadix(RADIX_HEX);
      } else if (this._initDiagram.radix === RADIX_DEC) {
        $("#" + this._radixSelectId).val("" + this._radixSelectDecId).selectmenu('refresh');
        this.radix = RADIX_DEC;
        this.setRadix(RADIX_DEC);
      }
    }
  }

  Waveform.prototype.setOnChangeListener = function(listener) {
    if (typeof listener === 'function') {
      return this._onChangeListener = listener;
    }
  };

  Waveform.prototype.setOnSaveListener = function(listener) {
    if (typeof listener === 'function') {
      return this._onSaveListener = listener;
    }
  };

  Waveform.prototype.exportTimingDiagram = function() {
    var exported, hiddenOrder, renderedOrder, signal;
    renderedOrder = (function() {
      var j, len, ref, results;
      ref = this.renderedSignals;
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        signal = ref[j];
        results.push(signal.id);
      }
      return results;
    }).call(this);
    hiddenOrder = (function() {
      var j, len, ref, results;
      ref = this.removedSignals;
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        signal = ref[j];
        results.push(signal.id);
      }
      return results;
    }).call(this);
    exported = {
      rendered: renderedOrder,
      hidden: hiddenOrder,
      from: this.renderFrom,
      to: this.renderTo,
      cursor: this.currentTime,
      cursorExact: this.currentExactTime,
      end: this.endTime,
      originalEnd: this.originalEndTime,
      radix: this.radix,
      timeScale: this.timeScale,
      timeScaleUnit: this.timeScaleUnit,
      timeUnit: this.timeUnit,
      highlightedIndex: this.highlightedIndex
    };
    return JSON.stringify(exported);
  };

  Waveform.prototype.resetTimingDiagram = function() {
    var busSignal, depth, j, len, levels, ref, signal, signalId;
    this.timeScale = this._data.scale.match(/(\d+)/);
    this.timeScaleUnit = this._data.scale.match(/(\D+)/);
    if ((this.timeScale == null) || !this.timeScaleUnit) {
      return null;
    }
    this.timeScale = this.timeScale[0];
    this.timeScaleUnit = this.timeScaleUnit[0];
    this.timeUnit = parseInt(this.timeScale);
    if (this.timeScaleUnit === 'ns') {
      this.timeUnit *= 1000;
    }
    this.radix = RADIX_BIN;
    this.originalEndTime = this._data.endtime;
    this.endTime = this.ceilFive(this.originalEndTime);
    this.renderFrom = 0;
    if (this.originalEndTime > 100) {
      this.renderTo = this.floorInt(this.endTime, 100);
    } else {
      this.renderTo = this.roundInt(this.endTime / 2.0, 10);
    }
    this.signals = this._data.signal;
    this.renderedSignals = [];
    this.removedSignals = [];
    this.includedSignals = [];
    this.excludedSignals = [];
    ref = this.signals;
    for (j = 0, len = ref.length; j < len; j++) {
      signal = ref[j];
      if (!(typeof signal.name === 'string' || signal.name.trim() === '')) {
        continue;
      }
      levels = signal.name.split('.');
      depth = levels.length;
      signalId = signal.name;
      if (depth > 1) {
        levels.splice(0, 1);
      }
      signal.name = levels.join('.');
      busSignal = this.isBus(signal.name);
      if (depth === 2) {
        if (indexOf.call(this.includedSignals, signalId) < 0) {
          this.renderedSignals.push({
            id: signalId,
            signal: signal,
            text: null,
            ypos: null,
            currentValue: '0',
            type: busSignal ? BUS_SIGNAL : WIRE_SIGNAL,
            width: busSignal ? Math.abs(busSignal.start - busSignal.end) + 1 : 1
          });
          this.includedSignals.push(signalId);
        }
      } else if (depth > 2) {
        if (indexOf.call(this.excludedSignals, signalId) < 0) {
          this.removedSignals.push({
            id: signalId,
            signal: signal,
            text: null,
            ypos: null,
            currentValue: '0',
            type: busSignal ? BUS_SIGNAL : WIRE_SIGNAL,
            width: busSignal ? Math.abs(busSignal.start - busSignal.end) + 1 : 1
          });
          this.excludedSignals.push(signalId);
        }
      }
    }
    this.currentTime = void 0;
    this.currentExactTime = void 0;
    this.highlightedIndex = void 0;
    this.redraw();
    if (this._cursor) {
      this._cursor.setVisible(false);
      this._cursor.time = void 0;
      this.refreshCurrentValues();
      this._cursorValueDiv.text('');
    }
    $("#" + this._radixSelectId).val("" + this._radixSelectBinId).selectmenu('refresh');
    this.setRadix(RADIX_BIN);
    if (this._onChangeListener) {
      return this._onChangeListener({
        type: 'reset'
      });
    }
  };

  Waveform.prototype.redraw = function() {
    if (this.renderTo > this.endTime) {
      this.renderTo = this.endTime;
    }
    this.clearCanvas();
    this.drawGrid(this.renderFrom, this.renderTo);
    this.drawSignals(this.renderFrom, this.renderTo);
    if (this._cursor) {
      this._canvas.add(this._cursor);
    }
    if (this.highlighted) {
      this.highlighted.fill = void 0;
      this.highlighted.opacity = 0;
    }
    if (this.highlightedIndex) {
      this.highlighted = this.renderedSignals[this.highlightedIndex].highlight;
      this.highlighted.fill = DEFAULT_COLOR.SIGNAL_HIGHLIGHT;
      return this.highlighted.opacity = DEFAULT_OPACITY.SIGNAL_HIGHLIGHT;
    }
  };

  Waveform.prototype.setCursorTime = function(exactTime) {
    var cursorCurrentValueText, cursorPos, time;
    if (exactTime == null) {
      return;
    }
    time = exactTime.toFixed(2);
    cursorPos = this._timeToPos(exactTime, null, false);
    this.currentTime = time;
    this.currentExactTime = exactTime;
    if (this._cursor != null) {
      this._cursor.x1 = cursorPos;
      this._cursor.x2 = cursorPos;
      this._cursor.setLeft(cursorPos);
      this._cursor.setTop(0);
      this._cursor.setHeight(this.canvasHeight);
      this._cursor.width = 1;
    } else {
      this._cursor = new fabric.Line([cursorPos, 0, cursorPos, this.canvasHeight], {
        fill: DEFAULT_COLOR.CURSOR,
        stroke: DEFAULT_COLOR.CURSOR,
        strokeWidth: 1,
        opacity: DEFAULT_OPACITY.CURSOR,
        selectable: false,
        hasControls: false,
        hasRotatingPoint: false,
        width: 1
      });
      this._cursorValueDiv.show();
    }
    if (time < this.renderFrom || time > this.renderTo) {
      this._cursor.setVisible(false);
    } else {
      this._cursor.setVisible(true);
    }
    if (!this._canvas.contains(this._cursor)) {
      this._canvas.add(this._cursor);
    }
    this._cursor.time = this.currentTime;
    this.refreshCurrentValues();
    cursorCurrentValueText = 'Time: ' + this.currentTime + this.timeScaleUnit;
    if (this.highlighted) {
      cursorCurrentValueText = cursorCurrentValueText + ', Value: ' + this._getFormattedValue(this.highlighted.signal.currentValue, this.highlighted.signal.width);
    }
    this._cursorValueDiv.text(cursorCurrentValueText);
    if (this._onChangeListener) {
      this._onChangeListener({
        type: 'cursor'
      });
    }
    return this._canvas.renderAll();
  };

  Waveform.prototype.drawGrid = function(start, end) {
    var currentTarget, i, j, k, len, len1, line, lineCords, linePos, lineStep, ref, ref1, results, text;
    if (start == null) {
      start = this.renderFrom;
    }
    if (end == null) {
      end = this.renderTo;
    }
    this._signalsNamesRect = new fabric.Rect({
      width: SIGNAL_NAMES_BOX_WIDTH,
      height: this._canvas.height,
      fill: DEFAULT_COLOR.SIGNAL_NAME_RECT,
      opacity: DEFAULT_OPACITY.SIGNAL_NAME_RECT
    });
    this._renderDist = Math.abs(this.renderTo - this.renderFrom);
    lineStep = Math.floor(this._renderDist / (GRID_SECTIONS - 1));
    i = this.renderFrom + lineStep;
    while (i <= this.renderTo) {
      i += lineStep;
    }
    currentTarget = i - lineStep;
    i = this.renderFrom + lineStep;
    this._renderDistanceFactor = (this._canvas.width - SIGNAL_NAMES_BOX_WIDTH) / this._renderDist;
    this._gridLines = [];
    this._gridTexts = [];
    while (i <= currentTarget) {
      linePos = this._timeToPos(i);
      lineCords = [linePos, RULER_HEIGHT, linePos, this._canvas.height];
      this._gridLines.push(this._getGridLine(lineCords));
      this._gridTexts.push(new fabric.Text(i + this.timeScaleUnit, {
        font: 'Arial',
        left: linePos - 10,
        top: 0,
        fontSize: 11,
        selectable: false,
        hasControls: false,
        hasRotatingPoint: false,
        fill: DEFAULT_COLOR.GRID_TEXT
      }));
      i += lineStep;
    }
    ref = this._gridLines;
    for (j = 0, len = ref.length; j < len; j++) {
      line = ref[j];
      this._canvas.add(line);
    }
    ref1 = this._gridTexts;
    results = [];
    for (k = 0, len1 = ref1.length; k < len1; k++) {
      text = ref1[k];
      results.push(this._canvas.add(text));
    }
    return results;
  };

  Waveform.prototype.refreshSignalValues = function() {
    var j, len, ref, val;
    ref = this._signalValueText;
    for (j = 0, len = ref.length; j < len; j++) {
      val = ref[j];
      val.textbox.setText(this._getFormattedValue(val.value, val.width));
    }
    return this._canvas.renderAll();
  };

  Waveform.prototype.drawSignals = function(start, end) {
    var currentValueSpanWidth, currentValueText, currentValueWidth, highlightRect, initialValue, j, k, len, len1, originX, originY, overflowWidth, ranges, ref, ref1, rendered, signal, signalBus, signalIndex, valueIndex, valueObject;
    if (start == null) {
      start = this.renderFrom;
    }
    if (end == null) {
      end = this.renderTo;
    }
    this._drawSignalNames();
    signalIndex = -1;
    this._signalValueText = [];
    ref = this.renderedSignals;
    for (j = 0, len = ref.length; j < len; j++) {
      rendered = ref[j];
      signalIndex++;
      signal = rendered.signal;
      ranges = this._getSignalValues(signal.wave, start, end);
      signalBus = this.isBus(signal.name);
      initialValue = ranges[0].value;
      originX = SIGNAL_NAMES_BOX_WIDTH;
      originY = rendered.ypos;
      if (initialValue === '0' || initialValue === 'x' || initialValue === 'z') {
        originY += SIGNAL_HEIGHT;
      }
      if (signalBus) {
        originY = rendered.ypos + SIGNAL_HEIGHT / 2.0;
      }
      valueIndex = 0;
      for (k = 0, len1 = ranges.length; k < len1; k++) {
        valueObject = ranges[k];
        valueObject.width = rendered.width;
        if (valueIndex === ranges.length - 1) {
          valueObject.last = true;
        }
        ref1 = this._drawValue(valueObject, originX, originY, initialValue, DEFAULT_COLOR.SIGNAL, signalBus !== false), originX = ref1[0], originY = ref1[1], initialValue = ref1[2];
        valueIndex++;
      }
      highlightRect = new fabric.Rect({
        left: 2,
        top: rendered.ypos - 1,
        height: SIGNAL_HEIGHT + 3,
        width: this.canvasWidth,
        fill: void 0,
        opacity: 0,
        selectable: false,
        hasControls: false,
        hasRotatingPoint: false
      });
      highlightRect.signal = rendered;
      rendered.highlight = highlightRect;
      rendered.currentValue = ranges[0].value;
      currentValueText = this._getFormattedValue(ranges[0].value, ranges[0].width);
      this._signalCurrentValues[signalIndex].setText(currentValueText);
      currentValueWidth = this._signalCurrentValues[signalIndex].width;
      currentValueSpanWidth = Math.abs(SIGNAL_NAMES_BOX_WIDTH - SIGNAL_BOX_WIDTH - 10);
      overflowWidth = currentValueWidth > currentValueSpanWidth;
      while (currentValueWidth > currentValueSpanWidth) {
        currentValueText = currentValueText.substr(0, currentValueText.length - 1);
        this._signalCurrentValues[signalIndex].setText(currentValueText);
        currentValueWidth = this._signalCurrentValues[signalIndex].width;
      }
      if (overflowWidth) {
        currentValueWidth = currentValueWidth + '..';
      }
      this._canvas.add(this._signalCurrentValues[signalIndex]);
      this._canvas.add(highlightRect);
    }
    this._canvas.bringToFront(this._currentValueLineStart);
    this._canvas.bringToFront(this._currentValueLineEnd);
    return this._canvas.renderAll();
  };

  Waveform.prototype.refreshCurrentValues = function() {
    var currentValueSpanWidth, currentValueText, currentValueWidth, ind, j, k, len, len1, overflowWidth, ref, rendered, signal, signalIndex, value, wave;
    signalIndex = 0;
    ref = this.renderedSignals;
    for (j = 0, len = ref.length; j < len; j++) {
      rendered = ref[j];
      signal = rendered.signal;
      wave = signal.wave;
      ind = 0;
      for (k = 0, len1 = wave.length; k < len1; k++) {
        value = wave[k];
        if (this.currentTime >= Number.parseInt(value[0])) {
          if (ind === wave.length - 1 || this.currentTime <= Number.parseInt(wave[ind + 1])) {
            rendered.currentValue = value[1];
            break;
          }
        }
        ind++;
      }
      currentValueText = this._getFormattedValue(rendered.currentValue, rendered.width);
      this._signalCurrentValues[signalIndex].setText(currentValueText);
      currentValueWidth = this._signalCurrentValues[signalIndex].width;
      currentValueSpanWidth = Math.abs(SIGNAL_NAMES_BOX_WIDTH - SIGNAL_BOX_WIDTH - 14);
      overflowWidth = currentValueWidth > currentValueSpanWidth;
      while (currentValueWidth > currentValueSpanWidth) {
        currentValueText = currentValueText.substr(0, currentValueText.length - 1);
        this._signalCurrentValues[signalIndex].setText(currentValueText);
        currentValueWidth = this._signalCurrentValues[signalIndex].width;
      }
      if (overflowWidth) {
        currentValueWidth = currentValueWidth + '..';
      }
      signalIndex++;
    }
    return this._canvas.renderAll();
  };

  Waveform.prototype.addSignal = function() {
    var dialogMessage, dialogTitle, index, j, len, options, ref, removedSignal, selectableId;
    options = "";
    index = 0;
    ref = this.removedSignals;
    for (j = 0, len = ref.length; j < len; j++) {
      removedSignal = ref[j];
      options = options + "<li class=\"ui-widget-content\" value=\"" + index + "\">" + removedSignal.signal.name + "</li>\n";
      index++;
    }
    selectableId = this._containerId + "-waveform-add-signal-select";
    dialogTitle = "Add Signals";
    dialogMessage = "<ol id=\"" + selectableId + "\" class=\"ui-widget ui-corner-all waveform-add-signal-select\" multiple>\n" + options + "</select>";
    $("#" + this._modalDialogId).html(dialogMessage);
    $("#" + selectableId).selectable();
    return $("#" + this._modalDialogId).dialog({
      resizable: false,
      modal: true,
      title: dialogTitle,
      height: 400,
      width: 300,
      buttons: {
        'Add': (function(_this) {
          return function() {
            var ind, k, l, len1, len2, rmCounter, rmIndices, selected, selection, selectionIndex;
            selected = $("#" + selectableId + " .ui-selected");
            rmIndices = [];
            for (k = 0, len1 = selected.length; k < len1; k++) {
              selection = selected[k];
              selectionIndex = $(selection).val();
              if (indexOf.call(_this.includedSignals, selectionIndex) < 0) {
                _this.renderedSignals.push(_this.removedSignals[selectionIndex]);
                rmIndices.push(selectionIndex);
                _this.excludedSignals.splice(_this.excludedSignals.indexOf(selectionIndex, 1));
                _this.includedSignals.push(selectionIndex);
              }
            }
            rmIndices.sort();
            rmCounter = 0;
            for (l = 0, len2 = rmIndices.length; l < len2; l++) {
              ind = rmIndices[l];
              _this.removedSignals.splice(ind - rmCounter, 1);
              rmCounter++;
            }
            if (rmIndices.length) {
              _this.redraw();
            }
            $("#" + _this._modalDialogId).dialog('close');
            if (_this._onChangeListener) {
              return _this._onChangeListener({
                type: 'add'
              });
            }
          };
        })(this),
        'Cancel': function() {
          return $(this).dialog('close');
        }
      },
      close: (function(_this) {
        return function() {
          return $("#" + _this._modalDialogId).html('');
        };
      })(this)
    });
  };

  Waveform.prototype.removeSignal = function() {
    var dialogMessage, dialogTitle, signal, signalIndex, signalName;
    if (!this.highlighted) {
      return;
    }
    signalIndex = this.renderedSignals.indexOf(this.highlighted.signal);
    signal = this.highlighted.signal.signal;
    signalName = signal.name;
    dialogTitle = "Remove Signal " + signalName + "?";
    dialogMessage = "<p><span class=\"ui-icon ui-icon-alert\" style=\"float:left; margin:0 7px 20px 0;\"></span>Do you want to remove the selected signal?</p>";
    $("#" + this._modalDialogId).html(dialogMessage);
    return $("#" + this._modalDialogId).dialog({
      resizable: false,
      modal: true,
      title: dialogTitle,
      height: 150,
      width: 320,
      buttons: {
        'Remove': (function(_this) {
          return function() {
            if (_this.highlighted) {
              _this.highlighted.fill = void 0;
              _this.highlighted.opacity = 0;
            }
            _this.highlighted = void 0;
            _this.highlightedIndex = void 0;
            if (indexOf.call(_this.excludedSignals, signalIndex) < 0) {
              _this.removedSignals.push(_this.renderedSignals[signalIndex]);
              _this.renderedSignals.splice(signalIndex, 1);
              _this.excludedSignals.push(signalIndex);
              _this.includedSignals.splice(_this.includedSignals.indexOf(signalIndex, 1));
              _this.redraw();
            }
            $("#" + _this._modalDialogId).dialog('close');
            if (_this._onChangeListener) {
              return _this._onChangeListener({
                type: 'remove'
              });
            }
          };
        })(this),
        'Cancel': function() {
          return $(this).dialog('close');
        }
      },
      close: (function(_this) {
        return function() {
          return $("#" + _this._modalDialogId).html('');
        };
      })(this)
    });
  };

  Waveform.prototype.moveFirst = function() {
    if (this.renderFrom === 0) {
      return;
    }
    this.renderFrom = 0;
    this.renderTo = this.renderFrom + this._renderDist;
    if (this.renderTo > this.endTime) {
      this.renderTo = this.endTime;
    }
    this.redraw();
    return this.setCursorTime(this.currentExactTime);
  };

  Waveform.prototype.moveLeft = function() {
    var factor, newFrom, newTo;
    if (this.renderFrom === 0) {
      return;
    }
    factor = Math.floor(this._renderDist / 8.0);
    newFrom = this.renderFrom - factor;
    if (newFrom < 0) {
      newFrom = 0;
    }
    newTo = newFrom + this._renderDist;
    if (newTo > this.endTime) {
      newTo = this.endTime;
    }
    this.renderFrom = newFrom;
    this.renderTo = newTo;
    this.redraw();
    return this.setCursorTime(this.currentExactTime);
  };

  Waveform.prototype.moveRight = function() {
    var factor, newFrom, newTo;
    if (this.renderTo === this.endTime) {
      return;
    }
    factor = Math.floor(this._renderDist / 8.0);
    newTo = this.renderTo + factor;
    if (newTo > this.endTime) {
      newTo = this.endTime;
    }
    newFrom = newTo - this._renderDist;
    if (newFrom < 0) {
      newFrom = 0;
    }
    this.renderFrom = newFrom;
    this.renderTo = newTo;
    this.redraw();
    return this.setCursorTime(this.currentExactTime);
  };

  Waveform.prototype.zoomIn = function() {
    var cursorTime, factor, newDistance, newFrom, newTo;
    factor = Math.floor(this._renderDist / 4.0);
    newFrom = this.renderFrom + factor;
    newTo = this.renderTo - factor;
    if (this._cursor != null) {
      cursorTime = Math.round(this._cursor.time);
      if (cursorTime - factor < this.renderFrom) {
        newFrom = this.renderFrom;
        newTo = this.renderTo - 2 * factor;
      } else if (cursorTime + factor > this.renderTo) {
        newFrom = this.renderFrom + 2 * factor;
        newTo = this.renderTo;
      } else {
        newFrom = cursorTime - factor;
        newTo = cursorTime + factor;
      }
    }
    if (newFrom > newTo || newTo < 0 || newFrom >= newTo) {
      return;
    }
    newDistance = newTo - newFrom;
    this.scaleFactor = newDistance / this.originalEndTime;
    if (this.scaleFactor < 0.08) {
      return;
    }
    if (factor) {
      this.renderFrom = newFrom;
      this.renderTo = newTo;
      this.redraw();
      return this.setCursorTime(this.currentExactTime);
    }
  };

  Waveform.prototype.zoomOut = function() {
    var factor, newDistance, newFrom, newTo, zoomDistance;
    zoomDistance = 2 * this._renderDist;
    newFrom = void 0;
    newTo = void 0;
    if (zoomDistance > this.originalEndTime) {
      newFrom = 0;
      newTo = this.endTime;
    } else {
      factor = Math.floor(this._renderDist / 2.0);
      newFrom = this.renderFrom - factor;
      newTo = this.renderTo + factor;
      if (newTo > this.endTime) {
        newTo = this.endTime;
        newFrom = newTo - zoomDistance;
      }
      if (newFrom < 0) {
        newFrom = 0;
      }
    }
    newDistance = newTo - newFrom;
    this.scaleFactor = newDistance / this.originalEndTime;
    this.renderFrom = newFrom;
    this.renderTo = newTo;
    this.redraw();
    return this.setCursorTime(this.currentExactTime);
  };

  Waveform.prototype.zoomAll = function() {
    if (this.renderFrom === 0 && this.renderTo === this.endTime) {
      return;
    }
    this.renderFrom = 0;
    this.renderTo = this.endTime;
    this.redraw();
    return this.setCursorTime(this.currentExactTime);
  };

  Waveform.prototype.setRadix = function(newRadix) {
    if (newRadix !== RADIX_BIN && newRadix !== RADIX_DEC && newRadix !== RADIX_HEX) {
      return;
    }
    this.radix = newRadix;
    this.refreshCurrentValues();
    return this.refreshSignalValues();
  };

  Waveform.prototype.isBus = function(signalName) {
    var matches;
    matches = /[\s\S]+\[(\d+)\:(\d+)\]\s*/.exec(signalName);
    if (matches == null) {
      return false;
    } else {
      return {
        start: matches[1],
        end: matches[2]
      };
    }
  };

  Waveform.prototype.clearCanvas = function() {
    return this._canvas.clear();
  };

  Waveform.prototype.binToDec = function(value) {
    return Number.parseInt(value, 2).toString(10);
  };

  Waveform.prototype.binToHex = function(value) {
    return Number.parseInt(value, 2).toString(16).toUpperCase();
  };

  Waveform.prototype.pad = function(value, width, padding) {
    if (padding == null) {
      padding = '0';
    }
    value = value + '';
    if (value.length >= width) {
      return value;
    } else {
      return new Array(width - value.length + 1).join(padding) + value;
    }
  };

  Waveform.prototype.pointDist = function(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  };

  Waveform.prototype.getRandomColor = function() {
    var color, i, j, letters;
    letters = '0123456789ABCDEF'.split('');
    color = '#';
    for (i = j = 0; j < 6; i = ++j) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  Waveform.prototype.ceilInt = function(value, divis) {
    value = Math.round(value);
    while (value % divis) {
      value++;
    }
    return value;
  };

  Waveform.prototype.floorInt = function(value, divis) {
    value = Math.round(value);
    while (value % divis) {
      value--;
    }
    return value;
  };

  Waveform.prototype.roundInt = function(value, divis) {
    var ceilValue, floorValue;
    value = Math.round(value);
    if (!(value % divis)) {
      return value;
    }
    ceilValue = value;
    floorValue = value;
    while (ceilValue % divis && floorValue % divis) {
      ceilValue++;
      floorValue--;
    }
    if (ceilValue % divis) {
      return floorValue;
    } else {
      return ceilValue;
    }
  };

  Waveform.prototype.ceilFive = function(value) {
    return this.ceilInt(value, 5);
  };

  Waveform.prototype.floorFive = function(value) {
    return this.floorInt(value, 5);
  };

  Waveform.prototype.roundFive = function(value) {
    return this.roundInt(value, 5);
  };

  Waveform.prototype._initCanvas = function() {
    this._canvas = new fabric.Canvas(this._canvasId, {
      width: this.canvasWidth,
      height: this.canvasHeight,
      backgroundColor: DEFAULT_COLOR.CANVAS_BACKGROUND,
      renderOnAddRemove: false,
      selection: false,
      stateful: false
    });
    this._context = this._canvas.getContext('2d');
    this._isDragging = false;
    this._draggedSignal = void 0;
    this._draggedOriginalX = void 0;
    this._draggedOriginalY = void 0;
    this._draggedMouseX = void 0;
    this._draggedMouseY = void 0;
    this._dragRectangle = void 0;
    this._dragRectangleOriginalHeight = void 0;
    this._canvas.on('mouse:down', (function(_this) {
      return function(options) {
        var pointer;
        if (options.target) {
          pointer = _this._canvas.getPointer(options.e);
          if (options.target.signal) {
            if (_this.highlighted) {
              _this.highlighted.fill = void 0;
              _this.highlighted.opacity = 0;
            }
            _this.highlighted = options.target;
            _this.highlightedIndex = _this.renderedSignals.indexOf(options.target.signal);
            options.target.fill = DEFAULT_COLOR.SIGNAL_HIGHLIGHT;
            options.target.opacity = DEFAULT_OPACITY.SIGNAL_HIGHLIGHT;
          } else {
            if (_this.highlighted) {
              _this.highlighted.fill = void 0;
              _this.highlighted.opacity = 0;
            }
            _this.highlighted = void 0;
            _this.highlightedIndex = void 0;
          }
          if (options.target.signal) {
            _this._draggedSignal = options.target;
            _this._draggedOriginalX = options.target.left;
            _this._draggedOriginalY = options.target.top;
            _this._draggedMouseX = pointer.x;
            _this._draggedMouseY = pointer.y;
          }
          _this._isDragging = true;
          return _this._canvas.renderAll();
        }
      };
    })(this));
    this._canvas.on('mouse:move', (function(_this) {
      return function(options) {
        var pointer;
        if (_this._isDragging) {
          pointer = _this._canvas.getPointer(options.e);
          if (_this._draggedSignal != null) {
            _this._draggedSignal.setTop((pointer.y - _this._draggedMouseY) + _this._draggedOriginalY);
            _this._draggedSignal.opacity = DEFAULT_OPACITY.SIGNAL_DRAGGED;
          }
          if ((_this._dragRectangle != null) && options.target !== _this._dragRectangle) {
            _this._dragRectangle.setHeight(_this._dragRectangleOriginalHeight);
            _this._dragRectangleOriginalHeight = void 0;
            _this._dragRectangle.fill = void 0;
            _this._dragRectangle.opacity = 0;
            _this._dragRectangle = void 0;
          }
          if (options.target && options.target.signal && options.target !== _this._draggedSignal && options.target !== _this._dragRectangle) {
            _this._dragRectangle = options.target;
            _this._dragRectangle.fill = DEFAULT_COLOR.SIGNAL_DRAGGED;
            _this._dragRectangle.opacity = DEFAULT_OPACITY.SIGNAL_DRAGGED;
            _this._dragRectangleOriginalHeight = _this._dragRectangle.height;
            _this._dragRectangle.setHeight(_this._dragRectangle.height / 2.0);
          }
          return _this._canvas.renderAll();
        }
      };
    })(this));
    return this._canvas.on('mouse:up', (function(_this) {
      return function(options) {
        var pointer, sourceIndex, targetIndex, validTarget;
        if (_this._isDragging) {
          validTarget = options.target && options.target.signal && _this._draggedSignal !== options.target;
          if (_this._draggedSignal != null) {
            if (_this._draggedOriginalX != null) {
              if (validTarget) {
                sourceIndex = _this.renderedSignals.indexOf(_this._draggedSignal.signal);
                targetIndex = _this.renderedSignals.indexOf(options.target.signal);
                _this.renderedSignals.splice(targetIndex, 0, _this.renderedSignals.splice(sourceIndex, 1)[0]);
                _this._draggedSignal.set({
                  left: _this._draggedOriginalX,
                  top: _this._draggedOriginalY
                });
                if (_this._dragRectangle != null) {
                  _this._dragRectangle.setHeight(_this._dragRectangleOriginalHeight);
                  _this._dragRectangle.fill = void 0;
                  _this._dragRectangleOriginalHeight = void 0;
                  _this._dragRectangle.opacity = 0;
                  _this._dragRectangle = void 0;
                }
                _this.highlightedIndex = targetIndex;
                _this.redraw();
                if (_this._onChangeListener) {
                  _this._onChangeListener({
                    type: 'sort'
                  });
                }
              } else {
                _this._draggedSignal.set({
                  left: _this._draggedOriginalX,
                  top: _this._draggedOriginalY
                });
              }
            }
          }
        }
        if (_this._dragRectangle != null) {
          _this._dragRectangle.setHeight(_this._dragRectangleOriginalHeight);
          _this._dragRectangleOriginalHeight = void 0;
          _this._dragRectangle.fill = void 0;
          _this._dragRectangle.opacity = 0;
          _this._dragRectangle = void 0;
        }
        _this._isDragging = false;
        _this._draggedSignal = void 0;
        _this._draggedOriginalX = void 0;
        _this._draggedOriginalY = void 0;
        _this._draggedMouseX = void 0;
        _this._draggedMouseY = void 0;
        pointer = _this._canvas.getPointer(options.e);
        if (pointer.x > SIGNAL_NAMES_BOX_WIDTH) {
          _this.setCursorTime(_this._posToTime(pointer.x, null, false));
        }
        return _this._canvas.renderAll();
      };
    })(this));
  };

  Waveform.prototype._drawValue = function(valueObject, originX, originY, initialValue, signalColor, busSignal, start, end) {
    var centrePoint, endPos, isLast, lastPoint, pointsTime, polyLine, polyPoints, polyText, polyWidth, startPos, textValue, textWidth, value, widthOverflow;
    if (signalColor == null) {
      signalColor = DEFAULT_COLOR.SIGNAL;
    }
    if (busSignal == null) {
      busSignal = false;
    }
    if (start == null) {
      start = this.renderFrom;
    }
    if (end == null) {
      end = this.renderTo;
    }
    value = valueObject.value;
    startPos = this._timeToPos(valueObject.start);
    endPos = this._timeToPos(valueObject.end);
    isLast = valueObject.last;
    if (!busSignal) {
      polyPoints = [];
      lastPoint = [];
      polyLine = void 0;
      if (initialValue === '0' || initialValue === 'x' || initialValue === 'z') {
        if (value === '1') {
          polyPoints.push({
            x: this._timeToPos(valueObject.start),
            y: originY
          });
          polyPoints.push({
            x: this._timeToPos(valueObject.start),
            y: originY - SIGNAL_HEIGHT
          });
          polyPoints.push({
            x: this._timeToPos(valueObject.end),
            y: originY - SIGNAL_HEIGHT
          });
          lastPoint = [polyPoints[polyPoints.length - 1].x, polyPoints[polyPoints.length - 1].y];
          polyLine = new fabric.Polyline(polyPoints, {
            stroke: signalColor,
            fill: void 0,
            selectable: false,
            hasControls: false,
            hasRotatingPoint: false
          });
          this._canvas.add(polyLine);
        } else if (value === '0') {
          polyPoints.push({
            x: this._timeToPos(valueObject.start),
            y: originY
          });
          polyPoints.push({
            x: this._timeToPos(valueObject.end),
            y: originY
          });
          lastPoint = [polyPoints[polyPoints.length - 1].x, polyPoints[polyPoints.length - 1].y];
          polyLine = new fabric.Polyline(polyPoints, {
            stroke: signalColor,
            fill: void 0,
            selectable: false,
            hasControls: false,
            hasRotatingPoint: false
          });
          this._canvas.add(polyLine);
        } else if (value === 'x') {
          polyPoints.push({
            x: this._timeToPos(valueObject.start),
            y: originY
          });
          polyPoints.push({
            x: this._timeToPos(valueObject.end),
            y: originY
          });
          lastPoint = [polyPoints[polyPoints.length - 1].x, polyPoints[polyPoints.length - 1].y];
          polyLine = new fabric.Polyline(polyPoints, {
            stroke: DEFAULT_COLOR.SIGNAL_DC,
            fill: void 0,
            selectable: false,
            hasControls: false,
            hasRotatingPoint: false
          });
          this._canvas.add(polyLine);
        } else if (value.toLowerCase() === 'z') {
          polyPoints.push({
            x: this._timeToPos(valueObject.start),
            y: originY
          });
          polyPoints.push({
            x: this._timeToPos(valueObject.end),
            y: originY
          });
          lastPoint = [polyPoints[polyPoints.length - 1].x, polyPoints[polyPoints.length - 1].y];
          polyLine = new fabric.Polyline(polyPoints, {
            stroke: DEFAULT_COLOR.SIGNAL_IMPED,
            fill: void 0,
            selectable: false,
            hasControls: false,
            hasRotatingPoint: false
          });
          this._canvas.add(polyLine);
        }
      } else if (initialValue === '1') {
        if (value === '1') {
          polyPoints.push({
            x: this._timeToPos(valueObject.start),
            y: originY
          });
          polyPoints.push({
            x: this._timeToPos(valueObject.end),
            y: originY
          });
          lastPoint = [polyPoints[polyPoints.length - 1].x, polyPoints[polyPoints.length - 1].y];
          polyLine = new fabric.Polyline(polyPoints, {
            stroke: signalColor,
            fill: void 0,
            selectable: false,
            hasControls: false,
            hasRotatingPoint: false
          });
          this._canvas.add(polyLine);
        } else if (value === '0') {
          polyPoints.push({
            x: this._timeToPos(valueObject.start),
            y: originY
          });
          polyPoints.push({
            x: this._timeToPos(valueObject.start),
            y: originY + SIGNAL_HEIGHT
          });
          polyPoints.push({
            x: this._timeToPos(valueObject.end),
            y: originY + SIGNAL_HEIGHT
          });
          lastPoint = [polyPoints[polyPoints.length - 1].x, polyPoints[polyPoints.length - 1].y];
          polyLine = new fabric.Polyline(polyPoints, {
            stroke: signalColor,
            fill: void 0,
            selectable: false,
            hasControls: false,
            hasRotatingPoint: false
          });
          this._canvas.add(polyLine);
        } else if (value === 'x' || value.toLowerCase() === 'z') {
          polyPoints.push({
            x: this._timeToPos(valueObject.start),
            y: originY
          });
          polyPoints.push({
            x: this._timeToPos(valueObject.start),
            y: originY + SIGNAL_HEIGHT
          });
          polyPoints.push({
            x: this._timeToPos(valueObject.end),
            y: originY + SIGNAL_HEIGHT
          });
          lastPoint = [polyPoints[polyPoints.length - 1].x, polyPoints[polyPoints.length - 1].y];
          polyLine = new fabric.Polyline(polyPoints, {
            stroke: signalColor,
            fill: void 0,
            selectable: false,
            hasControls: false,
            hasRotatingPoint: false
          });
          this._canvas.add(polyLine);
        }
      }
      return [lastPoint[0], lastPoint[1], value, polyLine];
    } else {
      polyPoints = [];
      lastPoint = [];
      pointsTime = Date.now();
      polyPoints.push({
        x: this._timeToPos(valueObject.start) + SIGNAL_BUS_SLOPE,
        y: originY + SIGNAL_HEIGHT / 2.0
      });
      polyPoints.push({
        x: this._timeToPos(valueObject.start),
        y: originY
      });
      polyPoints.push({
        x: this._timeToPos(valueObject.start) + SIGNAL_BUS_SLOPE,
        y: originY - SIGNAL_HEIGHT / 2.0
      });
      polyPoints.push({
        x: this._timeToPos(valueObject.end) - SIGNAL_BUS_SLOPE,
        y: originY - SIGNAL_HEIGHT / 2.0
      });
      if (!isLast) {
        polyPoints.push({
          x: this._timeToPos(valueObject.end),
          y: originY
        });
      } else {
        polyPoints.push({
          x: this._timeToPos(valueObject.end) + SIGNAL_BUS_SLOPE + 2,
          y: originY - SIGNAL_HEIGHT / 2.0
        });
        polyPoints.push({
          x: this._timeToPos(valueObject.end) + SIGNAL_BUS_SLOPE + 2,
          y: originY + SIGNAL_HEIGHT / 2.0
        });
      }
      polyPoints.push({
        x: this._timeToPos(valueObject.end) - SIGNAL_BUS_SLOPE,
        y: originY + SIGNAL_HEIGHT / 2.0
      });
      polyPoints.push({
        x: this._timeToPos(valueObject.start) + SIGNAL_BUS_SLOPE,
        y: originY + SIGNAL_HEIGHT / 2.0
      });
      lastPoint = [polyPoints[polyPoints.length - 1].x, polyPoints[polyPoints.length - 1].y];
      polyWidth = this.pointDist(polyPoints[2].x, polyPoints[2].y, polyPoints[3].x, polyPoints[3].y);
      polyLine = new fabric.Polyline(polyPoints, {
        stroke: value === 'x' ? DEFAULT_COLOR.SIGNAL_DC : value.toLowerCase() === 'z' ? DEFAULT_COLOR.SIGNAL_IMPED : signalColor,
        fill: void 0,
        selectable: false,
        hasControls: false,
        hasRotatingPoint: false
      });
      this._canvas.add(polyLine);
      centrePoint = polyLine.getCenterPoint();
      polyText = new fabric.Text(this._getFormattedValue(value, valueObject.width), {
        font: 'Arial',
        fontSize: 11,
        selectable: false,
        hasControls: false,
        hasRotatingPoint: false,
        fill: DEFAULT_COLOR.SIGNAL_VALUE
      });
      polyText.set('left', centrePoint.x - polyText.width / 2.0);
      polyText.set('top', centrePoint.y - polyText.height / 2.0);
      textValue = polyText.text;
      textWidth = polyText.width;
      widthOverflow = textWidth > polyWidth;
      while (textWidth > polyWidth) {
        textValue = textValue.substr(0, textValue.length - 1);
        polyText.setText(textValue);
        polyText.setLeft(polyText.left + 1);
        textWidth = polyText.width;
      }
      if (widthOverflow) {
        textValue = textValue + '..';
        polyText.setText(textValue);
        polyText.setLeft(polyText.left + 1);
      }
      this._signalValueText.push({
        textbox: polyText,
        width: valueObject.width,
        value: value
      });
      this._canvas.add(polyText);
      return [this._timeToPos(valueObject.end), originY, value, polyLine];
    }
  };

  Waveform.prototype._getGridLine = function(coords) {
    return new fabric.Line(coords, {
      fill: DEFAULT_COLOR.GRID_LINE,
      stroke: DEFAULT_COLOR.GRID_LINE,
      strokeWidth: 1,
      opacity: 0.3,
      selectable: false,
      hasControls: false,
      hasRotatingPoint: false
    });
  };

  Waveform.prototype._drawSignalNames = function() {
    var busSignal, j, k, len, len1, nameboxText, ref, ref1, rendered, results, signal, signalCurrentValue, signalPos, textarea;
    signalPos = SIGNAL_BOX_PADDING + RULER_HEIGHT;
    this._signalNames = [];
    this._signalCurrentValues = [];
    ref = this.renderedSignals;
    for (j = 0, len = ref.length; j < len; j++) {
      rendered = ref[j];
      signal = rendered.signal;
      busSignal = this.isBus(signal.name);
      nameboxText = new fabric.IText(signal.name, {
        font: 'Arial',
        left: 10,
        top: signalPos + 4,
        fontSize: 12,
        selectable: false,
        hasControls: false,
        hasRotatingPoint: false,
        width: SIGNAL_BOX_WIDTH,
        height: SIGNAL_BOX_HEIGHT,
        fill: DEFAULT_COLOR.SIGNAL_NAME
      });
      signalCurrentValue = new fabric.IText('0', {
        font: 'Arial',
        left: SIGNAL_BOX_WIDTH + 12,
        top: signalPos + 4,
        fontSize: 11,
        selectable: false,
        hasControls: false,
        hasRotatingPoint: false,
        width: SIGNAL_BOX_WIDTH,
        height: SIGNAL_BOX_HEIGHT,
        fill: DEFAULT_COLOR.SIGNAL_CURRENT_VALUE
      });
      this._signalNames.push(nameboxText);
      rendered.text = nameboxText;
      rendered.ypos = signalPos;
      this._signalCurrentValues.push(signalCurrentValue);
      signalPos += SIGNAL_BOX_HEIGHT + SIGNAL_BOX_PADDING;
    }
    this._currentValueLineStart = new fabric.Line([SIGNAL_BOX_WIDTH + 10, 0, SIGNAL_BOX_WIDTH + 10, this._canvas.height], {
      fill: DEFAULT_COLOR.CURRENT_VALUE_LINE,
      stroke: DEFAULT_COLOR.CURRENT_VALUE_LINE,
      strokeWidth: 1,
      opacity: 1,
      selectable: false,
      hasControls: false,
      hasRotatingPoint: false
    });
    this._currentValueLineEnd = new fabric.Line([SIGNAL_NAMES_BOX_WIDTH, 0, SIGNAL_NAMES_BOX_WIDTH, this._canvas.height], {
      fill: DEFAULT_COLOR.CURRENT_VALUE_LINE,
      stroke: DEFAULT_COLOR.CURRENT_VALUE_LINE,
      strokeWidth: 1,
      opacity: 1,
      selectable: false,
      hasControls: false,
      hasRotatingPoint: false
    });
    this._canvas.add(this._currentValueLineStart);
    this._canvas.add(this._currentValueLineEnd);
    ref1 = this._signalNames;
    results = [];
    for (k = 0, len1 = ref1.length; k < len1; k++) {
      textarea = ref1[k];
      this._canvas.add(textarea);
      if (textarea.width > SIGNAL_BOX_WIDTH) {
        results.push(textarea.scaleToWidth(SIGNAL_BOX_WIDTH - 10));
      } else {
        results.push(void 0);
      }
    }
    return results;
  };

  Waveform.prototype._getSignalValues = function(wave, start, end) {
    var _between, newValue, valueAdded, valueEnd, valueStart, values, waveIndex, waveValue;
    if (start == null) {
      start = this.renderFrom;
    }
    if (end == null) {
      end = this.renderTo;
    }
    if (wave.length === 0) {
      return [];
    }
    values = [];
    valueAdded = false;
    waveIndex = 0;
    _between = function(val, startRange, endRange) {
      if (startRange == null) {
        startRange = start;
      }
      if (endRange == null) {
        endRange = end;
      }
      return (val >= startRange) && (val <= endRange);
    };
    while (waveIndex < wave.length) {
      waveValue = wave[waveIndex];
      valueStart = Number.parseInt(waveValue[0]);
      valueEnd = waveIndex === wave.length - 1 ? end : Number.parseInt(wave[waveIndex + 1][0]);
      newValue = {
        start: 0,
        end: 0,
        value: waveValue[1]
      };
      if (_between(valueStart) && _between(valueEnd)) {
        newValue.start = valueStart;
        newValue.end = valueEnd;
      } else if (_between(valueStart) && valueEnd > end) {
        newValue.start = valueStart;
        newValue.end = end;
      } else if (_between(valueEnd) && valueStart < start) {
        newValue.start = start;
        newValue.end = valueEnd;
      } else {
        waveIndex++;
        continue;
      }
      values.push(newValue);
      valueAdded = true;
      waveIndex++;
    }
    if (!valueAdded) {
      return [
        {
          start: start,
          end: end,
          value: wave[wave.length - 1][1]
        }
      ];
    }
    return values;
  };

  Waveform.prototype._timeToPos = function(time, from, round) {
    if (from == null) {
      from = this.renderFrom;
    }
    if (round == null) {
      round = true;
    }
    if (round) {
      return Math.round(SIGNAL_NAMES_BOX_WIDTH + time * this._renderDistanceFactor - Math.round(from * this._renderDistanceFactor));
    } else {
      return SIGNAL_NAMES_BOX_WIDTH + time * this._renderDistanceFactor - from * this._renderDistanceFactor;
    }
  };

  Waveform.prototype._posToTime = function(pos, from, round) {
    if (from == null) {
      from = this.renderFrom;
    }
    if (round == null) {
      round = true;
    }
    if (round) {
      return Math.round((pos - SIGNAL_NAMES_BOX_WIDTH) / this._renderDistanceFactor) + Math.round(from);
    } else {
      return (pos - SIGNAL_NAMES_BOX_WIDTH) / this._renderDistanceFactor + from;
    }
  };

  Waveform.prototype._getFormattedValue = function(value, length) {
    if (length == null) {
      length = 8;
    }
    if (this.radix === RADIX_DEC) {
      if (value === 'x') {
        return "" + (this.pad(value, length, 'x'));
      } else if (value.toLowerCase() === 'z') {
        return "" + (this.pad(value, length, 'z'));
      } else {
        return "" + (this.binToDec(value));
      }
    } else if (this.radix === RADIX_HEX) {
      if (value === 'x') {
        return "" + (this.pad(value, length, 'x'));
      } else if (value.toLowerCase() === 'z') {
        return "" + (this.pad(value, length, 'z'));
      } else {
        return "0x" + (this.binToHex(value));
      }
    } else if (this.radix === RADIX_BIN) {
      if (value === 'x') {
        return "" + (this.pad(value, length, 'x'));
      } else if (value.toLowerCase() === 'z') {
        return "" + (this.pad(value, length, 'z'));
      } else {
        return "" + (this.pad(value, length));
      }
    }
  };

  Waveform.prototype._initLayout = function() {
    this._addSignalButtonId = this._containerId + "-waveform-add-btn";
    this._addSignalButton = $("<button class=\"waveform-toolbar-btn\" id=\"" + this._addSignalButtonId + "\">Add Sginal</button>");
    this._removeSignalButtonId = this._containerId + "-waveform-remove-btn";
    this._removeSignalButton = $("<button class=\"waveform-toolbar-btn\" id=\"" + this._removeSignalButtonId + "\">Remove Sginal</button>");
    this._zoomInButtonId = this._containerId + "-waveform-zoomin-btn";
    this._zoomInButton = $("<button class=\"waveform-toolbar-btn\" id=\"" + this._zoomInButtonId + "\">Zoom In</button>");
    this._zoomOutButtonId = this._containerId + "-waveform-zoomout-btn";
    this._zoomOutButton = $("<button class=\"waveform-toolbar-btn\" id=\"" + this._zoomOutButtonId + "\">Zoom Out</button>");
    this._zoomAllButtonId = this._containerId + "-waveform-zoomall-btn";
    this._zoomAllButton = $("<button class=\"waveform-toolbar-btn\" id=\"" + this._zoomAllButtonId + "\">Zoom All</button>");
    this._gotoFirstButtonId = this._containerId + "-waveform-gotofirst-btn";
    this._gotoFirstButton = $("<button class=\"waveform-toolbar-btn\" id=\"" + this._gotoFirstButtonId + "\">Goto First</button>");
    this._goLeftButtonId = this._containerId + "-waveform-goleft-btn";
    this._goLeftButton = $("<button class=\"waveform-toolbar-btn\" id=\"" + this._goLeftButtonId + "\">Go Left</button>");
    this._goRightButtonId = this._containerId + "-waveform-goright-btn";
    this._goRightButton = $("<button class=\"waveform-toolbar-btn\" id=\"" + this._goRightButtonId + "\">Go Right</button>");
    this._resetButtonId = this._containerId + "-waveform-reset-btn";
    this._resetButton = $("<button class=\"waveform-toolbar-btn\" id=\"" + this._goRightButtonId + "\">Reset Timing Diagram</button>");
    this._radixSelectBinId = this._containerId + "-waveform-radix-bin";
    this._optionBin = $("<option class=\"waveform-toolbar-option\" id=\"" + this._radixSelectBinId + "\" value=\"" + this._radixSelectBinId + "\" selected>Binary</option>");
    this._radixSelectDecId = this._containerId + "-waveform-radix-dec";
    this._optionDec = $("<option class=\"waveform-toolbar-option\" id=\"" + this._radixSelectDecId + "\" value=\"" + this._radixSelectDecId + "\">Decimal</option>");
    this._radixSelectHexId = this._containerId + "-waveform-radix-hex";
    this._optionHex = $("<option class=\"waveform-toolbar-option\" id=\"" + this._radixSelectHexId + "\" value=\"" + this._radixSelectHexId + "\">Hexadecimal</option>");
    this._radixSelectId = this._containerId + "-waveform-radix-select";
    this._radixSelectLabelId = this._containerId + "-waveform-radix-select-label";
    this._radixSelectLabel = $("<label class=\"waveform-toolbar-label\" id=\"" + this._radixSelectLabelId + "\" for=\"" + this._radixSelectId + "\">Select a speed</label>");
    this._radixSelect = $("<select class=\"waveform-toolbar-select\" name=\"radix-select\" id=\"" + this._radixSelectId + "\"></select>");
    this._cursorValueId = this._containerId + "-waveform-toolbar-cursor-value";
    this._cursorValueDiv = $("<div id=\"" + this._cursorValueId + "\" class=\"cursor-toolbar-value\">Cursor: 0ns</div>");
    this._modalDialogId = this._containerId + "-waveform-modal";
    this._modalDialog = $("<div id=\"" + this._modalDialogId + "\"></div>");
    this._toolbardId = this._containerId + "-waveform-toolbar";
    this._waveformToolbar = $("<div id=\"" + this._toolbardId + "\" class=\"ui-widget-header ui-corner-all waveform-toolbar\"></div>");
    this._waveformToolbar.append(this._addSignalButton);
    this._waveformToolbar.append(this._removeSignalButton);
    this._waveformToolbar.append(this._zoomInButton);
    this._waveformToolbar.append(this._zoomOutButton);
    this._waveformToolbar.append(this._zoomAllButton);
    this._waveformToolbar.append(this._gotoFirstButton);
    this._waveformToolbar.append(this._goLeftButton);
    this._waveformToolbar.append(this._goRightButton);
    this._waveformToolbar.append(this._resetButton);
    this._radixSelect.append(this._optionBin);
    this._radixSelect.append(this._optionDec);
    this._radixSelect.append(this._optionHex);
    this._waveformToolbar.append(this._radixSelect);
    this._waveformToolbar.append(this._cursorValueDiv);
    this._cursorValueDiv.hide();
    this._container.append(this._waveformToolbar);
    this._container.append(this._modalDialog);
    this._canvasId = this._containerId + "-waveform-canvas";
    this._canvasWrapper = $("<canvas class=\"waveform-canvas\" id=\"" + this._canvasId + "\"></canvas>");
    this._canvasViewportId = this._containerId + "-waveform-canvas-viewport";
    this._canvasViewport = $("<div class=\"canvas-viewport\" id=\"" + this._canvasViewportId + "\"></div>");
    this._canvasViewport.append(this._canvasWrapper);
    this._container.append(this._canvasViewport);
    this.canvasHeight = CANVAS_MAX_HEIGHT;
    this.canvasWidth = this._container.width();
    this.viewportHeight = this._container.height();
    this.canvasHeight = CANVAS_MAX_HEIGHT;
    this._canvasViewport.attr('tabIndex', 1000);
    $("#" + this._canvasViewportId).keydown((function(_this) {
      return function(e) {
        if (e.keyCode === 38) {
          if (_this.highlighted) {
            _this.highlighted.fill = void 0;
            _this.highlighted.opacity = 0;
          }
          _this.highlightedIndex--;
          if (_this.highlightedIndex < 0) {
            _this.highlightedIndex = _this.renderedSignals.length - 1;
          }
          _this.highlighted = _this.renderedSignals[_this.highlightedIndex].highlight;
          _this.highlighted.fill = DEFAULT_COLOR.SIGNAL_HIGHLIGHT;
          _this.highlighted.opacity = DEFAULT_OPACITY.SIGNAL_HIGHLIGHT;
          _this._canvas.renderAll();
          _this.setCursorTime(_this.currentExactTime);
          return e.preventDefault();
        } else if (e.keyCode === 40) {
          if (_this.highlighted) {
            _this.highlighted.fill = void 0;
            _this.highlighted.opacity = 0;
          }
          _this.highlightedIndex++;
          if (_this.highlightedIndex >= _this.renderedSignals.length) {
            _this.highlightedIndex = 0;
          }
          _this.highlighted = _this.renderedSignals[_this.highlightedIndex].highlight;
          _this.highlighted.fill = DEFAULT_COLOR.SIGNAL_HIGHLIGHT;
          _this.highlighted.opacity = DEFAULT_OPACITY.SIGNAL_HIGHLIGHT;
          _this._canvas.renderAll();
          _this.setCursorTime(_this.currentExactTime);
          return e.preventDefault();
        } else if (e.ctrlKey && e.keyCode === 83) {
          if (_this._onSaveListener) {
            _this._onSaveListener(_this.exportTimingDiagram());
          }
          return e.preventDefault();
        }
      };
    })(this));
    this._addSignalButton.button({
      text: false,
      icons: {
        primary: 'ui-icon-plus'
      }
    });
    this._addSignalButton.click((function(_this) {
      return function(e) {
        return _this.addSignal();
      };
    })(this));
    this._removeSignalButton.button({
      text: false,
      icons: {
        primary: 'ui-icon-minus'
      }
    });
    this._removeSignalButton.click((function(_this) {
      return function(e) {
        return _this.removeSignal();
      };
    })(this));
    this._zoomInButton.button({
      text: false,
      icons: {
        primary: 'ui-icon-zoomin'
      }
    });
    this._zoomInButton.click((function(_this) {
      return function(e) {
        return _this.zoomIn();
      };
    })(this));
    this._zoomOutButton.button({
      text: false,
      icons: {
        primary: 'ui-icon-zoomout'
      }
    });
    this._zoomOutButton.click((function(_this) {
      return function(e) {
        return _this.zoomOut();
      };
    })(this));
    this._zoomAllButton.button({
      text: false,
      icons: {
        primary: 'ui-icon-arrow-4-diag'
      }
    });
    this._zoomAllButton.click((function(_this) {
      return function(e) {
        return _this.zoomAll();
      };
    })(this));
    this._gotoFirstButton.button({
      text: false,
      icons: {
        primary: 'ui-icon-arrowstop-1-w'
      }
    });
    this._gotoFirstButton.click((function(_this) {
      return function(e) {
        return _this.moveFirst();
      };
    })(this));
    this._goLeftButton.button({
      text: false,
      icons: {
        primary: 'ui-icon-triangle-1-w'
      }
    });
    this._goLeftButton.click((function(_this) {
      return function(e) {
        return _this.moveLeft();
      };
    })(this));
    this._goRightButton.button({
      text: false,
      icons: {
        primary: 'ui-icon-triangle-1-e'
      }
    });
    this._goRightButton.click((function(_this) {
      return function(e) {
        return _this.moveRight();
      };
    })(this));
    this._resetButton.button({
      text: false,
      icons: {
        primary: 'ui-icon-arrowrefresh-1-n'
      }
    });
    this._resetButton.click((function(_this) {
      return function(e) {
        return _this.resetTimingDiagram();
      };
    })(this));
    this._radixSelect.selectmenu();
    $("#" + this._containerId + "-waveform-radix-select-button").css('display', 'inline-table');
    $("#" + this._containerId + "-waveform-radix-select-button").find('.ui-selectmenu-text').css('line-height', '0.6');
    return this._radixSelect.on("selectmenuchange", (function(_this) {
      return function(ui, e) {
        var selectedRadixId;
        selectedRadixId = e.item.value;
        if (selectedRadixId === _this._radixSelectBinId) {
          return _this.setRadix(RADIX_BIN);
        } else if (selectedRadixId === _this._radixSelectDecId) {
          return _this.setRadix(RADIX_DEC);
        } else if (selectedRadixId === _this._radixSelectHexId) {
          return _this.setRadix(RADIX_HEX);
        }
      };
    })(this));
  };

  return Waveform;

})();

//# sourceMappingURL=data:application/json;base64,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LElBQUksQ0FBQztRQUN6QixJQUFHLGVBQUEsS0FBbUIsS0FBQyxDQUFBLGlCQUF2QjtpQkFDSSxLQUFDLENBQUEsUUFBRCxDQUFVLFNBQVYsRUFESjtTQUFBLE1BRUssSUFBRyxlQUFBLEtBQW1CLEtBQUMsQ0FBQSxpQkFBdkI7aUJBQ0QsS0FBQyxDQUFBLFFBQUQsQ0FBVSxTQUFWLEVBREM7U0FBQSxNQUVBLElBQUcsZUFBQSxLQUFtQixLQUFDLENBQUEsaUJBQXZCO2lCQUNELEtBQUMsQ0FBQSxRQUFELENBQVUsU0FBVixFQURDOztNQU40QjtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBckM7RUFwTFMiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8iLCJzb3VyY2VzQ29udGVudCI6WyJjbGFzcyBXYXZlZm9ybVxuICAgICd1c2Ugc3RyaWN0J1xuICAgIFJVTEVSX0hFSUdIVCA9IDE0XG4gICAgR1JJRF9TRUNUSU9OUyA9IDExXG4gICAgU0lHTkFMX05BTUVTX0JPWF9XSURUSCA9IDIyMFxuICAgIFNJR05BTF9OQU1FX1dJRFRIID0gMTUwXG4gICAgU0lHTkFMX0JPWF9IRUlHSFQgPSAyMFxuICAgIFNJR05BTF9CT1hfV0lEVEggPSAxNjBcbiAgICBTSUdOQUxfQk9YX1BBRERJTkcgPSA4XG4gICAgU0lHTkFMX0hFSUdIVCA9IDIwXG4gICAgU0lHTkFMX0JVU19TTE9QRSA9IDNcblxuICAgIFdJUkVfU0lHTkFMID0gMFxuICAgIEJVU19TSUdOQUwgPSAxXG5cbiAgICBSQURJWF9CSU4gPSAwXG4gICAgUkFESVhfREVDID0gMVxuICAgIFJBRElYX0hFWCA9IDJcblxuICAgIENBTlZBU19NQVhfSEVJR0hUID0gMzAwMFxuXG4gICAgREVGQVVMVF9DT0xPUiA9XG4gICAgICAgICAgICAgICAgICAgIENBTlZBU19CQUNLR1JPVU5EOiAnYmxhY2snXG4gICAgICAgICAgICAgICAgICAgIENVUlNPUjogJ3JnYig2NCwgMTg2LCAyNTUpJ1xuICAgICAgICAgICAgICAgICAgICBHUklEX1RFWFQ6ICdncmF5J1xuICAgICAgICAgICAgICAgICAgICBTSUdOQUw6ICdyZ2IoOCwgMjU1LCA0MCknXG4gICAgICAgICAgICAgICAgICAgIFNJR05BTF9OQU1FX1JFQ1Q6ICdncmF5J1xuICAgICAgICAgICAgICAgICAgICBTSUdOQUxfSElHSExJR0hUOiAncmdiKDk3LCAyNTUsIDApJ1xuICAgICAgICAgICAgICAgICAgICBTSUdOQUxfREM6ICdyZWQnXG4gICAgICAgICAgICAgICAgICAgIFNJR05BTF9JTVBFRDogJ2JsdWUnXG4gICAgICAgICAgICAgICAgICAgIFNJR05BTF9EUkFHR0VEOiAncmdiKDE5NywgMjU1LCAxNDUpJ1xuICAgICAgICAgICAgICAgICAgICBHUklEX0xJTkU6ICdncmF5J1xuICAgICAgICAgICAgICAgICAgICBTSUdOQUxfTkFNRTogJ3doaXRlJ1xuICAgICAgICAgICAgICAgICAgICBTSUdOQUxfVkFMVUU6ICd3aGl0ZSdcbiAgICAgICAgICAgICAgICAgICAgU0lHTkFMX0NVUlJFTlRfVkFMVUU6ICd3aGl0ZSdcbiAgICAgICAgICAgICAgICAgICAgQ1VSUkVOVF9WQUxVRV9MSU5FOiAnd2hpdGUnXG5cbiAgICBERUZBVUxUX09QQUNJVFkgPVxuICAgICAgICAgICAgICAgICAgICBDVVJTT1I6IDEuMFxuICAgICAgICAgICAgICAgICAgICBTSUdOQUxfTkFNRV9SRUNUOiAwLjJcbiAgICAgICAgICAgICAgICAgICAgU0lHTkFMX0hJR0hMSUdIVDogMC4zXG4gICAgICAgICAgICAgICAgICAgIFNJR05BTF9EUkFHR0VEOiAwLjNcblxuICAgIGNvbnN0cnVjdG9yOiAoQF9jb250YWluZXJJZCwgQF9kYXRhLCBAX2luaXREaWFncmFtKSAtPlxuICAgICAgICBAX2NvbnRhaW5lciA9ICQoXCIjI3tAX2NvbnRhaW5lcklkfVwiKVxuICAgICAgICByZXR1cm4gbnVsbCB1bmxlc3MgQF9jb250YWluZXIubGVuZ3RoXG5cbiAgICAgICAgaWYgdHlwZW9mIEBfaW5pdERpYWdyYW0gaXMgJ3N0cmluZydcbiAgICAgICAgICAgIHRyeVxuICAgICAgICAgICAgICAgIEBfaW5pdERpYWdyYW0gPSBKU09OLnBhcnNlIEBfaW5pdERpYWdyYW1cbiAgICAgICAgICAgIGNhdGNoIGVcbiAgICAgICAgICAgICAgICBAX2luaXREaWFncmFtID0gbnVsbFxuXG4gICAgICAgIEB0aW1lU2NhbGUgPSBAX2RhdGEuc2NhbGUubWF0Y2ggLyhcXGQrKS9cbiAgICAgICAgQHRpbWVTY2FsZVVuaXQgPSBAX2RhdGEuc2NhbGUubWF0Y2ggLyhcXEQrKS9cbiAgICAgICAgcmV0dXJuIG51bGwgaWYgbm90IEB0aW1lU2NhbGU/IG9yIG5vdCBAdGltZVNjYWxlVW5pdFxuICAgICAgICBAdGltZVNjYWxlID0gQHRpbWVTY2FsZVswXVxuICAgICAgICBAdGltZVNjYWxlVW5pdCA9IEB0aW1lU2NhbGVVbml0WzBdXG4gICAgICAgIEB0aW1lVW5pdCA9IHBhcnNlSW50IEB0aW1lU2NhbGVcbiAgICAgICAgaWYgQHRpbWVTY2FsZVVuaXQgaXMgJ25zJ1xuICAgICAgICAgICAgQHRpbWVVbml0ICo9IDEwMDBcblxuICAgICAgICBAcmFkaXggPSBSQURJWF9CSU5cblxuICAgICAgICBAb3JpZ2luYWxFbmRUaW1lID0gQF9kYXRhLmVuZHRpbWVcbiAgICAgICAgQGVuZFRpbWUgPSBAY2VpbEZpdmUgQG9yaWdpbmFsRW5kVGltZVxuICAgICAgICBAcmVuZGVyRnJvbSA9IDBcbiAgICAgICAgaWYgQG9yaWdpbmFsRW5kVGltZSA+IDEwMFxuICAgICAgICAgICAgQHJlbmRlclRvID0gQGZsb29ySW50IEBlbmRUaW1lLCAxMDBcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgQHJlbmRlclRvID0gQHJvdW5kSW50IChAZW5kVGltZSAvIDIuMCksIDEwXG4gICAgICAgIEBzaWduYWxzID0gQF9kYXRhLnNpZ25hbFxuXG4gICAgICAgIEBfb25DaGFuZ2VMaXN0ZW5lciA9IHVuZGVmaW5lZFxuICAgICAgICBAX29uU2F2ZUxpc3RlbmVyID0gdW5kZWZpbmVkXG5cbiAgICAgICAgaWYgQF9pbml0RGlhZ3JhbT9cbiAgICAgICAgICAgIGlmIEBfaW5pdERpYWdyYW0uZnJvbT9cbiAgICAgICAgICAgICAgICBAcmVuZGVyRnJvbSA9IEBfaW5pdERpYWdyYW0uZnJvbVxuICAgICAgICAgICAgaWYgQF9pbml0RGlhZ3JhbS50bz9cbiAgICAgICAgICAgICAgICBAcmVuZGVyVG8gPSBAX2luaXREaWFncmFtLnRvXG4gICAgICAgICAgICBpZiBAX2luaXREaWFncmFtLmVuZD9cbiAgICAgICAgICAgICAgICBAZW5kVGltZSA9IEBfaW5pdERpYWdyYW0uZW5kXG4gICAgICAgICAgICBpZiBAX2luaXREaWFncmFtLm9yaWdpbmFsRW5kP1xuICAgICAgICAgICAgICAgIEBvcmlnaW5hbEVuZFRpbWUgPSBAX2luaXREaWFncmFtLm9yaWdpbmFsRW5kXG4gICAgICAgICAgICBpZiBAX2luaXREaWFncmFtLnRpbWVTY2FsZT9cbiAgICAgICAgICAgICAgICBAdGltZVNjYWxlID0gQF9pbml0RGlhZ3JhbS50aW1lU2NhbGVcbiAgICAgICAgICAgIGlmIEBfaW5pdERpYWdyYW0udGltZVNjYWxlVW5pdD9cbiAgICAgICAgICAgICAgICBAdGltZVNjYWxlID0gQF9pbml0RGlhZ3JhbS50aW1lU2NhbGVVbml0XG4gICAgICAgICAgICBpZiBAX2luaXREaWFncmFtLnRpbWVVbml0P1xuICAgICAgICAgICAgICAgIEB0aW1lVW5pdCA9IEBfaW5pdERpYWdyYW0udGltZVVuaXRcbiAgICAgICAgICAgIGlmIEBfaW5pdERpYWdyYW0uY3Vyc29yPyBhbmQgQF9pbml0RGlhZ3JhbS5jdXJzb3JFeGFjdD9cbiAgICAgICAgICAgICAgICBAY3VycmVudFRpbWUgPSBAX2luaXREaWFncmFtLmN1cnNvclxuICAgICAgICAgICAgICAgIEBjdXJyZW50RXhhY3RUaW1lID0gQF9pbml0RGlhZ3JhbS5jdXJzb3JFeGFjdFxuXG4gICAgICAgIGZvciBzaWduYWwgaW4gQHNpZ25hbHNcbiAgICAgICAgICAgIHNpZ25hbC5vcmlnaW5hbE5hbWUgPSBzaWduYWwubmFtZVxuICAgICAgICB1bmxlc3MgQF9pbml0RGlhZ3JhbT8gYW5kIEBfaW5pdERpYWdyYW0uZnJvbT8gYW5kIEBfaW5pdERpYWdyYW0udG8/XG4gICAgICAgICAgICBAcmVuZGVyZWRTaWduYWxzID0gW11cbiAgICAgICAgICAgIEByZW1vdmVkU2lnbmFscyA9IFtdXG4gICAgICAgICAgICBAaW5jbHVkZWRTaWduYWxzID0gW11cbiAgICAgICAgICAgIEBleGNsdWRlZFNpZ25hbHMgPSBbXVxuICAgICAgICAgICAgZm9yIHNpZ25hbCBpbiBAc2lnbmFsc1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlIHVubGVzcyB0eXBlb2Ygc2lnbmFsLm5hbWUgaXMgJ3N0cmluZycgb3Igc2lnbmFsLm5hbWUudHJpbSgpIGlzICcnXG4gICAgICAgICAgICAgICAgbGV2ZWxzID0gc2lnbmFsLm5hbWUuc3BsaXQgJy4nXG4gICAgICAgICAgICAgICAgZGVwdGggPSBsZXZlbHMubGVuZ3RoXG4gICAgICAgICAgICAgICAgc2lnbmFsSWQgPSBzaWduYWwubmFtZVxuICAgICAgICAgICAgICAgIGlmIGRlcHRoID4gMVxuICAgICAgICAgICAgICAgICAgICBsZXZlbHMuc3BsaWNlIDAsIDFcbiAgICAgICAgICAgICAgICBzaWduYWwubmFtZSA9IGxldmVscy5qb2luICcuJ1xuICAgICAgICAgICAgICAgIGJ1c1NpZ25hbCA9IEBpc0J1cyBzaWduYWwubmFtZVxuICAgICAgICAgICAgICAgIGlmIGRlcHRoIGlzIDJcbiAgICAgICAgICAgICAgICAgICAgdW5sZXNzIHNpZ25hbElkIGluIEBpbmNsdWRlZFNpZ25hbHNcbiAgICAgICAgICAgICAgICAgICAgICAgIEByZW5kZXJlZFNpZ25hbHMucHVzaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBzaWduYWxJZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNpZ25hbDogc2lnbmFsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogbnVsbFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHlwb3M6IG51bGxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50VmFsdWU6ICcwJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGlmIGJ1c1NpZ25hbCB0aGVuIEJVU19TSUdOQUwgZWxzZSBXSVJFX1NJR05BTFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBpZiBidXNTaWduYWwgdGhlbiBNYXRoLmFicyhidXNTaWduYWwuc3RhcnQgLSBidXNTaWduYWwuZW5kKSArIDEgZWxzZSAxXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW5jbHVkZWRTaWduYWxzLnB1c2ggc2lnbmFsSWRcbiAgICAgICAgICAgICAgICBlbHNlIGlmIGRlcHRoID4gMlxuICAgICAgICAgICAgICAgICAgICB1bmxlc3Mgc2lnbmFsSWQgaW4gQGV4Y2x1ZGVkU2lnbmFsc1xuICAgICAgICAgICAgICAgICAgICAgICAgQHJlbW92ZWRTaWduYWxzLnB1c2hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZDogc2lnbmFsSWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaWduYWw6IHNpZ25hbFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IG51bGxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB5cG9zOiBudWxsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFZhbHVlOiAnMCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBpZiBidXNTaWduYWwgdGhlbiBCVVNfU0lHTkFMIGVsc2UgV0lSRV9TSUdOQUxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogaWYgYnVzU2lnbmFsIHRoZW4gTWF0aC5hYnMoYnVzU2lnbmFsLnN0YXJ0IC0gYnVzU2lnbmFsLmVuZCkgKyAxIGVsc2UgMVxuICAgICAgICAgICAgICAgICAgICAgICAgQGV4Y2x1ZGVkU2lnbmFscy5wdXNoIHNpZ25hbElkXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHNpZ25hbE1hcCA9IHt9XG4gICAgICAgICAgICBAcmVuZGVyZWRTaWduYWxzID0gW11cbiAgICAgICAgICAgIEByZW1vdmVkU2lnbmFscyA9IFtdXG4gICAgICAgICAgICBAaW5jbHVkZWRTaWduYWxzID0gW11cbiAgICAgICAgICAgIEBleGNsdWRlZFNpZ25hbHMgPSBbXVxuICAgICAgICAgICAgZm9yIGluZGV4IGluIEBfaW5pdERpYWdyYW0ucmVuZGVyZWRcbiAgICAgICAgICAgICAgICBAaW5jbHVkZWRTaWduYWxzLnB1c2ggaW5kZXggdW5sZXNzIGluZGV4IGluIEBpbmNsdWRlZFNpZ25hbHNcbiAgICAgICAgICAgIGZvciBpbmRleCBpbiBAX2luaXREaWFncmFtLmhpZGRlblxuICAgICAgICAgICAgICAgIEBleGNsdWRlZFNpZ25hbHMucHVzaCBpbmRleCB1bmxlc3MgaW5kZXggaW4gQGV4Y2x1ZGVkU2lnbmFsc1xuICAgICAgICAgICAgQF9pbml0RGlhZ3JhbS5yZW5kZXJlZCA9IChpbmRleCBmb3IgaW5kZXggaW4gQGluY2x1ZGVkU2lnbmFscylcbiAgICAgICAgICAgIEBfaW5pdERpYWdyYW0uaGlkZGVuID0gKGluZGV4IGZvciBpbmRleCBpbiBAZXhjbHVkZWRTaWduYWxzKVxuXG4gICAgICAgICAgICBmb3Igc2lnbmFsIGluIEBzaWduYWxzXG4gICAgICAgICAgICAgICAgY29udGludWUgdW5sZXNzIHR5cGVvZiBzaWduYWwubmFtZSBpcyAnc3RyaW5nJyBvciBzaWduYWwubmFtZS50cmltKCkgaXMgJydcbiAgICAgICAgICAgICAgICBsZXZlbHMgPSBzaWduYWwubmFtZS5zcGxpdCAnLidcbiAgICAgICAgICAgICAgICBkZXB0aCA9IGxldmVscy5sZW5ndGhcbiAgICAgICAgICAgICAgICBzaWduYWxJZCA9IHNpZ25hbC5uYW1lXG4gICAgICAgICAgICAgICAgaWYgZGVwdGggPiAxXG4gICAgICAgICAgICAgICAgICAgIGxldmVscy5zcGxpY2UgMCwgMVxuICAgICAgICAgICAgICAgIHNpZ25hbC5uYW1lID0gbGV2ZWxzLmpvaW4gJy4nXG4gICAgICAgICAgICAgICAgYnVzU2lnbmFsID0gQGlzQnVzIHNpZ25hbC5uYW1lXG4gICAgICAgICAgICAgICAgc2lnbmFsTWFwW3NpZ25hbElkXSA9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IHNpZ25hbElkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2lnbmFsOiBzaWduYWxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBudWxsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeXBvczogbnVsbFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZTogJzAnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogaWYgYnVzU2lnbmFsIHRoZW4gQlVTX1NJR05BTCBlbHNlIFdJUkVfU0lHTkFMXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGlmIGJ1c1NpZ25hbCB0aGVuIE1hdGguYWJzKGJ1c1NpZ25hbC5zdGFydCAtIGJ1c1NpZ25hbC5lbmQpICsgMSBlbHNlIDFcbiAgICAgICAgICAgIEByZW5kZXJlZFNpZ25hbHMucHVzaCBzaWduYWxNYXBbc2lnbmFsSW5kZXhdIGZvciBzaWduYWxJbmRleCBpbiBAX2luaXREaWFncmFtLnJlbmRlcmVkXG4gICAgICAgICAgICBAcmVtb3ZlZFNpZ25hbHMucHVzaCBzaWduYWxNYXBbc2lnbmFsSW5kZXhdIGZvciBzaWduYWxJbmRleCBpbiBAX2luaXREaWFncmFtLmhpZGRlblxuICAgICAgICAgICAgaWYgdHlwZW9mIEBfaW5pdERpYWdyYW0uaGlnaGxpZ2h0ZWRJbmRleCBpcyAnbnVtYmVyJyBhbmQgQF9pbml0RGlhZ3JhbS5oaWdobGlnaHRlZEluZGV4IDwgQHJlbmRlcmVkU2lnbmFscy5sZW5ndGhcbiAgICAgICAgICAgICAgICBAaGlnaGxpZ2h0ZWRJbmRleCA9IEBfaW5pdERpYWdyYW0uaGlnaGxpZ2h0ZWRJbmRleFxuXG5cbiAgICAgICAgQF9pbml0TGF5b3V0KClcbiAgICAgICAgQF9pbml0Q2FudmFzKClcbiAgICAgICAgQHJlZHJhdygpXG4gICAgICAgIGlmIEBfaW5pdERpYWdyYW0/IGFuZCBAX2luaXREaWFncmFtLmN1cnNvcj8gYW5kIEBfaW5pdERpYWdyYW0uY3Vyc29yRXhhY3Q/XG4gICAgICAgICAgICBAc2V0Q3Vyc29yVGltZSBAY3VycmVudEV4YWN0VGltZVxuICAgICAgICBpZiBAX2luaXREaWFncmFtPyBhbmQgQF9pbml0RGlhZ3JhbS5yYWRpeD9cbiAgICAgICAgICAgIGlmIEBfaW5pdERpYWdyYW0ucmFkaXggaXMgUkFESVhfQklOXG4gICAgICAgICAgICAgICAgJChcIiMje0BfcmFkaXhTZWxlY3RJZH1cIikudmFsKFwiI3tAX3JhZGl4U2VsZWN0QmluSWR9XCIpLnNlbGVjdG1lbnUoJ3JlZnJlc2gnKVxuICAgICAgICAgICAgICAgIEByYWRpeCA9IFJBRElYX0JJTlxuICAgICAgICAgICAgICAgIEBzZXRSYWRpeCBSQURJWF9CSU5cbiAgICAgICAgICAgIGVsc2UgaWYgQF9pbml0RGlhZ3JhbS5yYWRpeCBpcyBSQURJWF9IRVhcbiAgICAgICAgICAgICAgICAkKFwiIyN7QF9yYWRpeFNlbGVjdElkfVwiKS52YWwoXCIje0BfcmFkaXhTZWxlY3RIZXhJZH1cIikuc2VsZWN0bWVudSgncmVmcmVzaCcpXG4gICAgICAgICAgICAgICAgQHJhZGl4ID0gUkFESVhfSEVYXG4gICAgICAgICAgICAgICAgQHNldFJhZGl4IFJBRElYX0hFWFxuICAgICAgICAgICAgZWxzZSBpZiBAX2luaXREaWFncmFtLnJhZGl4IGlzIFJBRElYX0RFQ1xuICAgICAgICAgICAgICAgICQoXCIjI3tAX3JhZGl4U2VsZWN0SWR9XCIpLnZhbChcIiN7QF9yYWRpeFNlbGVjdERlY0lkfVwiKS5zZWxlY3RtZW51KCdyZWZyZXNoJylcbiAgICAgICAgICAgICAgICBAcmFkaXggPSBSQURJWF9ERUNcbiAgICAgICAgICAgICAgICBAc2V0UmFkaXggUkFESVhfREVDXG5cbiAgICBzZXRPbkNoYW5nZUxpc3RlbmVyOiAobGlzdGVuZXIpIC0+XG4gICAgICAgIGlmIHR5cGVvZiBsaXN0ZW5lciBpcyAnZnVuY3Rpb24nXG4gICAgICAgICAgICBAX29uQ2hhbmdlTGlzdGVuZXIgPSBsaXN0ZW5lclxuXG4gICAgc2V0T25TYXZlTGlzdGVuZXI6IChsaXN0ZW5lcikgLT5cbiAgICAgICAgaWYgdHlwZW9mIGxpc3RlbmVyIGlzICdmdW5jdGlvbidcbiAgICAgICAgICAgIEBfb25TYXZlTGlzdGVuZXIgPSBsaXN0ZW5lclxuXG4gICAgZXhwb3J0VGltaW5nRGlhZ3JhbTogLT5cbiAgICAgICAgcmVuZGVyZWRPcmRlciA9XG4gICAgICAgICAgICAoZm9yIHNpZ25hbCBpbiBAcmVuZGVyZWRTaWduYWxzXG4gICAgICAgICAgICAgICAgc2lnbmFsLmlkKVxuICAgICAgICBoaWRkZW5PcmRlciA9XG4gICAgICAgICAgICAoZm9yIHNpZ25hbCBpbiBAcmVtb3ZlZFNpZ25hbHNcbiAgICAgICAgICAgICAgICBzaWduYWwuaWQpXG4gICAgICAgIGV4cG9ydGVkID1cbiAgICAgICAgICAgIHJlbmRlcmVkOiByZW5kZXJlZE9yZGVyXG4gICAgICAgICAgICBoaWRkZW46IGhpZGRlbk9yZGVyXG4gICAgICAgICAgICBmcm9tOiBAcmVuZGVyRnJvbVxuICAgICAgICAgICAgdG86IEByZW5kZXJUb1xuICAgICAgICAgICAgY3Vyc29yOiBAY3VycmVudFRpbWVcbiAgICAgICAgICAgIGN1cnNvckV4YWN0OiBAY3VycmVudEV4YWN0VGltZVxuICAgICAgICAgICAgZW5kOiBAZW5kVGltZVxuICAgICAgICAgICAgb3JpZ2luYWxFbmQ6IEBvcmlnaW5hbEVuZFRpbWVcbiAgICAgICAgICAgIHJhZGl4OiBAcmFkaXhcbiAgICAgICAgICAgIHRpbWVTY2FsZTogQHRpbWVTY2FsZVxuICAgICAgICAgICAgdGltZVNjYWxlVW5pdDogQHRpbWVTY2FsZVVuaXRcbiAgICAgICAgICAgIHRpbWVVbml0OiBAdGltZVVuaXRcbiAgICAgICAgICAgIGhpZ2hsaWdodGVkSW5kZXg6IEBoaWdobGlnaHRlZEluZGV4XG4gICAgICAgIEpTT04uc3RyaW5naWZ5IGV4cG9ydGVkXG5cbiAgICByZXNldFRpbWluZ0RpYWdyYW06IC0+XG4gICAgICAgIEB0aW1lU2NhbGUgPSBAX2RhdGEuc2NhbGUubWF0Y2ggLyhcXGQrKS9cbiAgICAgICAgQHRpbWVTY2FsZVVuaXQgPSBAX2RhdGEuc2NhbGUubWF0Y2ggLyhcXEQrKS9cbiAgICAgICAgcmV0dXJuIG51bGwgaWYgbm90IEB0aW1lU2NhbGU/IG9yIG5vdCBAdGltZVNjYWxlVW5pdFxuICAgICAgICBAdGltZVNjYWxlID0gQHRpbWVTY2FsZVswXVxuICAgICAgICBAdGltZVNjYWxlVW5pdCA9IEB0aW1lU2NhbGVVbml0WzBdXG4gICAgICAgIEB0aW1lVW5pdCA9IHBhcnNlSW50IEB0aW1lU2NhbGVcbiAgICAgICAgaWYgQHRpbWVTY2FsZVVuaXQgaXMgJ25zJ1xuICAgICAgICAgICAgQHRpbWVVbml0ICo9IDEwMDBcblxuICAgICAgICBAcmFkaXggPSBSQURJWF9CSU5cblxuICAgICAgICBAb3JpZ2luYWxFbmRUaW1lID0gQF9kYXRhLmVuZHRpbWVcbiAgICAgICAgQGVuZFRpbWUgPSBAY2VpbEZpdmUgQG9yaWdpbmFsRW5kVGltZVxuICAgICAgICBAcmVuZGVyRnJvbSA9IDBcbiAgICAgICAgaWYgQG9yaWdpbmFsRW5kVGltZSA+IDEwMFxuICAgICAgICAgICAgQHJlbmRlclRvID0gQGZsb29ySW50IEBlbmRUaW1lLCAxMDBcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgQHJlbmRlclRvID0gQHJvdW5kSW50IChAZW5kVGltZSAvIDIuMCksIDEwXG4gICAgICAgIEBzaWduYWxzID0gQF9kYXRhLnNpZ25hbFxuXG4gICAgICAgIEByZW5kZXJlZFNpZ25hbHMgPSBbXVxuICAgICAgICBAcmVtb3ZlZFNpZ25hbHMgPSBbXVxuICAgICAgICBAaW5jbHVkZWRTaWduYWxzID0gW11cbiAgICAgICAgQGV4Y2x1ZGVkU2lnbmFscyA9IFtdXG4gICAgICAgIGZvciBzaWduYWwgaW4gQHNpZ25hbHNcbiAgICAgICAgICAgIGNvbnRpbnVlIHVubGVzcyB0eXBlb2Ygc2lnbmFsLm5hbWUgaXMgJ3N0cmluZycgb3Igc2lnbmFsLm5hbWUudHJpbSgpIGlzICcnXG4gICAgICAgICAgICBsZXZlbHMgPSBzaWduYWwubmFtZS5zcGxpdCAnLidcbiAgICAgICAgICAgIGRlcHRoID0gbGV2ZWxzLmxlbmd0aFxuICAgICAgICAgICAgc2lnbmFsSWQgPSBzaWduYWwubmFtZVxuICAgICAgICAgICAgaWYgZGVwdGggPiAxXG4gICAgICAgICAgICAgICAgbGV2ZWxzLnNwbGljZSAwLCAxXG4gICAgICAgICAgICBzaWduYWwubmFtZSA9IGxldmVscy5qb2luICcuJ1xuICAgICAgICAgICAgYnVzU2lnbmFsID0gQGlzQnVzIHNpZ25hbC5uYW1lXG4gICAgICAgICAgICBpZiBkZXB0aCBpcyAyXG4gICAgICAgICAgICAgICAgdW5sZXNzIHNpZ25hbElkIGluIEBpbmNsdWRlZFNpZ25hbHNcbiAgICAgICAgICAgICAgICAgICAgQHJlbmRlcmVkU2lnbmFscy5wdXNoXG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogc2lnbmFsSWRcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpZ25hbDogc2lnbmFsXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBudWxsXG4gICAgICAgICAgICAgICAgICAgICAgICB5cG9zOiBudWxsXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50VmFsdWU6ICcwJ1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogaWYgYnVzU2lnbmFsIHRoZW4gQlVTX1NJR05BTCBlbHNlIFdJUkVfU0lHTkFMXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogaWYgYnVzU2lnbmFsIHRoZW4gTWF0aC5hYnMoYnVzU2lnbmFsLnN0YXJ0IC0gYnVzU2lnbmFsLmVuZCkgKyAxIGVsc2UgMVxuICAgICAgICAgICAgICAgICAgICBAaW5jbHVkZWRTaWduYWxzLnB1c2ggc2lnbmFsSWRcbiAgICAgICAgICAgIGVsc2UgaWYgZGVwdGggPiAyXG4gICAgICAgICAgICAgICAgdW5sZXNzIHNpZ25hbElkIGluIEBleGNsdWRlZFNpZ25hbHNcbiAgICAgICAgICAgICAgICAgICAgQHJlbW92ZWRTaWduYWxzLnB1c2hcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBzaWduYWxJZFxuICAgICAgICAgICAgICAgICAgICAgICAgc2lnbmFsOiBzaWduYWxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IG51bGxcbiAgICAgICAgICAgICAgICAgICAgICAgIHlwb3M6IG51bGxcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZTogJzAnXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBpZiBidXNTaWduYWwgdGhlbiBCVVNfU0lHTkFMIGVsc2UgV0lSRV9TSUdOQUxcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBpZiBidXNTaWduYWwgdGhlbiBNYXRoLmFicyhidXNTaWduYWwuc3RhcnQgLSBidXNTaWduYWwuZW5kKSArIDEgZWxzZSAxXG4gICAgICAgICAgICAgICAgICAgIEBleGNsdWRlZFNpZ25hbHMucHVzaCBzaWduYWxJZFxuXG5cbiAgICAgICAgQGN1cnJlbnRUaW1lID0gdW5kZWZpbmVkXG4gICAgICAgIEBjdXJyZW50RXhhY3RUaW1lID0gdW5kZWZpbmVkXG5cbiAgICAgICAgQGhpZ2hsaWdodGVkSW5kZXggPSB1bmRlZmluZWRcblxuICAgICAgICBAcmVkcmF3KClcbiAgICAgICAgaWYgQF9jdXJzb3JcbiAgICAgICAgICAgIEBfY3Vyc29yLnNldFZpc2libGUgbm9cbiAgICAgICAgICAgIEBfY3Vyc29yLnRpbWUgPSB1bmRlZmluZWRcblxuICAgICAgICAgICAgQHJlZnJlc2hDdXJyZW50VmFsdWVzKClcbiAgICAgICAgICAgIEBfY3Vyc29yVmFsdWVEaXYudGV4dCAnJ1xuXG4gICAgICAgICQoXCIjI3tAX3JhZGl4U2VsZWN0SWR9XCIpLnZhbChcIiN7QF9yYWRpeFNlbGVjdEJpbklkfVwiKS5zZWxlY3RtZW51KCdyZWZyZXNoJylcbiAgICAgICAgQHNldFJhZGl4IFJBRElYX0JJTlxuXG4gICAgICAgIGlmIEBfb25DaGFuZ2VMaXN0ZW5lclxuICAgICAgICAgICAgQF9vbkNoYW5nZUxpc3RlbmVyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVzZXQnXG5cblxuXG4gICAgcmVkcmF3OiAtPlxuICAgICAgICBpZiBAcmVuZGVyVG8gPiBAZW5kVGltZVxuICAgICAgICAgICAgQHJlbmRlclRvID0gQGVuZFRpbWVcbiAgICAgICAgQGNsZWFyQ2FudmFzKClcbiAgICAgICAgQGRyYXdHcmlkKEByZW5kZXJGcm9tLCBAcmVuZGVyVG8pXG4gICAgICAgIEBkcmF3U2lnbmFscyhAcmVuZGVyRnJvbSwgQHJlbmRlclRvKVxuICAgICAgICBpZiBAX2N1cnNvclxuICAgICAgICAgICAgQF9jYW52YXMuYWRkIEBfY3Vyc29yXG4gICAgICAgIGlmIEBoaWdobGlnaHRlZFxuICAgICAgICAgICAgQGhpZ2hsaWdodGVkLmZpbGwgPSB1bmRlZmluZWRcbiAgICAgICAgICAgIEBoaWdobGlnaHRlZC5vcGFjaXR5ID0gMFxuICAgICAgICBpZiBAaGlnaGxpZ2h0ZWRJbmRleFxuICAgICAgICAgICAgQGhpZ2hsaWdodGVkID0gQHJlbmRlcmVkU2lnbmFsc1tAaGlnaGxpZ2h0ZWRJbmRleF0uaGlnaGxpZ2h0XG4gICAgICAgICAgICBAaGlnaGxpZ2h0ZWQuZmlsbCA9IERFRkFVTFRfQ09MT1IuU0lHTkFMX0hJR0hMSUdIVFxuICAgICAgICAgICAgQGhpZ2hsaWdodGVkLm9wYWNpdHkgPSBERUZBVUxUX09QQUNJVFkuU0lHTkFMX0hJR0hMSUdIVFxuXG4gICAgc2V0Q3Vyc29yVGltZTogKGV4YWN0VGltZSkgLT5cbiAgICAgICAgcmV0dXJuIHVubGVzcyBleGFjdFRpbWU/XG4gICAgICAgIHRpbWUgPSBleGFjdFRpbWUudG9GaXhlZCgyKVxuICAgICAgICBjdXJzb3JQb3MgPSBAX3RpbWVUb1BvcyBleGFjdFRpbWUsIG51bGwsIG5vXG5cbiAgICAgICAgQGN1cnJlbnRUaW1lID0gdGltZVxuICAgICAgICBAY3VycmVudEV4YWN0VGltZSA9IGV4YWN0VGltZVxuXG4gICAgICAgIGlmIEBfY3Vyc29yP1xuICAgICAgICAgICAgQF9jdXJzb3IueDEgPSBjdXJzb3JQb3NcbiAgICAgICAgICAgIEBfY3Vyc29yLngyID0gY3Vyc29yUG9zXG4gICAgICAgICAgICBAX2N1cnNvci5zZXRMZWZ0IGN1cnNvclBvc1xuICAgICAgICAgICAgQF9jdXJzb3Iuc2V0VG9wIDBcbiAgICAgICAgICAgIEBfY3Vyc29yLnNldEhlaWdodCBAY2FudmFzSGVpZ2h0XG4gICAgICAgICAgICBAX2N1cnNvci53aWR0aCA9IDFcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgQF9jdXJzb3IgPSBuZXcgZmFicmljLkxpbmUgW2N1cnNvclBvcywgMCwgY3Vyc29yUG9zLCBAY2FudmFzSGVpZ2h0XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxsOiBERUZBVUxUX0NPTE9SLkNVUlNPUlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cm9rZTogREVGQVVMVF9DT0xPUi5DVVJTT1JcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJva2VXaWR0aDogMVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wYWNpdHk6IERFRkFVTFRfT1BBQ0lUWS5DVVJTT1JcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RhYmxlOiBub1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc0NvbnRyb2xzOiBub1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc1JvdGF0aW5nUG9pbnQ6IG5vXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IDFcbiAgICAgICAgICAgIEBfY3Vyc29yVmFsdWVEaXYuc2hvdygpXG4gICAgICAgIGlmIHRpbWUgPCBAcmVuZGVyRnJvbSBvciB0aW1lID4gQHJlbmRlclRvXG4gICAgICAgICAgICBAX2N1cnNvci5zZXRWaXNpYmxlIG5vXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIEBfY3Vyc29yLnNldFZpc2libGUgeWVzXG5cbiAgICAgICAgdW5sZXNzIEBfY2FudmFzLmNvbnRhaW5zIEBfY3Vyc29yXG4gICAgICAgICAgICBAX2NhbnZhcy5hZGQgQF9jdXJzb3JcbiAgICAgICAgQF9jdXJzb3IudGltZSA9IEBjdXJyZW50VGltZVxuXG4gICAgICAgIEByZWZyZXNoQ3VycmVudFZhbHVlcygpXG4gICAgICAgIGN1cnNvckN1cnJlbnRWYWx1ZVRleHQgPSAnVGltZTogJyArIEBjdXJyZW50VGltZSArIEB0aW1lU2NhbGVVbml0XG4gICAgICAgIGlmIEBoaWdobGlnaHRlZFxuICAgICAgICAgICAgY3Vyc29yQ3VycmVudFZhbHVlVGV4dCA9IGN1cnNvckN1cnJlbnRWYWx1ZVRleHQgKyAnLCBWYWx1ZTogJyArIEBfZ2V0Rm9ybWF0dGVkVmFsdWUoQGhpZ2hsaWdodGVkLnNpZ25hbC5jdXJyZW50VmFsdWUsIEBoaWdobGlnaHRlZC5zaWduYWwud2lkdGgpXG4gICAgICAgIEBfY3Vyc29yVmFsdWVEaXYudGV4dCBjdXJzb3JDdXJyZW50VmFsdWVUZXh0XG4gICAgICAgIGlmIEBfb25DaGFuZ2VMaXN0ZW5lclxuICAgICAgICAgICAgQF9vbkNoYW5nZUxpc3RlbmVyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY3Vyc29yJ1xuICAgICAgICBAX2NhbnZhcy5yZW5kZXJBbGwoKVxuXG5cbiAgICBkcmF3R3JpZDogKHN0YXJ0ID0gQHJlbmRlckZyb20sIGVuZCA9IEByZW5kZXJUbyktPlxuICAgICAgICBAX3NpZ25hbHNOYW1lc1JlY3QgPSBuZXcgZmFicmljLlJlY3RcbiAgICAgICAgICAgIHdpZHRoOiBTSUdOQUxfTkFNRVNfQk9YX1dJRFRIXG4gICAgICAgICAgICBoZWlnaHQ6IEBfY2FudmFzLmhlaWdodFxuICAgICAgICAgICAgZmlsbDogREVGQVVMVF9DT0xPUi5TSUdOQUxfTkFNRV9SRUNUXG4gICAgICAgICAgICBvcGFjaXR5OiBERUZBVUxUX09QQUNJVFkuU0lHTkFMX05BTUVfUkVDVFxuXG5cbiAgICAgICAgQF9yZW5kZXJEaXN0ID0gTWF0aC5hYnMgQHJlbmRlclRvIC0gQHJlbmRlckZyb21cbiAgICAgICAgbGluZVN0ZXAgPSBNYXRoLmZsb29yKEBfcmVuZGVyRGlzdCAvIChHUklEX1NFQ1RJT05TIC0gMSkpXG5cbiAgICAgICAgaSA9IEByZW5kZXJGcm9tICsgbGluZVN0ZXBcbiAgICAgICAgd2hpbGUgaSA8PSBAcmVuZGVyVG9cbiAgICAgICAgICAgIGkgKz0gbGluZVN0ZXBcbiAgICAgICAgY3VycmVudFRhcmdldCA9IGkgLSBsaW5lU3RlcFxuXG4gICAgICAgIGkgPSBAcmVuZGVyRnJvbSArIGxpbmVTdGVwXG4gICAgICAgIEBfcmVuZGVyRGlzdGFuY2VGYWN0b3IgPSAoQF9jYW52YXMud2lkdGggLSBTSUdOQUxfTkFNRVNfQk9YX1dJRFRIKSAvIEBfcmVuZGVyRGlzdFxuXG4gICAgICAgIEBfZ3JpZExpbmVzID0gW11cbiAgICAgICAgQF9ncmlkVGV4dHMgPSBbXVxuICAgICAgICB3aGlsZSBpIDw9IGN1cnJlbnRUYXJnZXRcbiAgICAgICAgICAgIGxpbmVQb3MgPSBAX3RpbWVUb1BvcyhpKVxuICAgICAgICAgICAgbGluZUNvcmRzID0gW2xpbmVQb3MsIFJVTEVSX0hFSUdIVCwgbGluZVBvcywgQF9jYW52YXMuaGVpZ2h0XVxuICAgICAgICAgICAgQF9ncmlkTGluZXMucHVzaCBAX2dldEdyaWRMaW5lIGxpbmVDb3Jkc1xuICAgICAgICAgICAgQF9ncmlkVGV4dHMucHVzaCBuZXcgZmFicmljLlRleHQgaSArIEB0aW1lU2NhbGVVbml0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9udDogJ0FyaWFsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGVmdDogbGluZVBvcyAtIDEwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b3A6IDBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvbnRTaXplOiAxMVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0YWJsZTogbm9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc0NvbnRyb2xzOiBub1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzUm90YXRpbmdQb2ludDogbm9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGw6IERFRkFVTFRfQ09MT1IuR1JJRF9URVhUXG4gICAgICAgICAgICBpICs9IGxpbmVTdGVwXG5cbiAgICAgICAgZm9yIGxpbmUgaW4gQF9ncmlkTGluZXNcbiAgICAgICAgICAgIEBfY2FudmFzLmFkZCBsaW5lXG4gICAgICAgIGZvciB0ZXh0IGluIEBfZ3JpZFRleHRzXG4gICAgICAgICAgICBAX2NhbnZhcy5hZGQgdGV4dFxuXG5cbiAgICByZWZyZXNoU2lnbmFsVmFsdWVzOiAtPlxuICAgICAgICBmb3IgdmFsIGluIEBfc2lnbmFsVmFsdWVUZXh0XG4gICAgICAgICAgICB2YWwudGV4dGJveC5zZXRUZXh0IEBfZ2V0Rm9ybWF0dGVkVmFsdWUgdmFsLnZhbHVlLCB2YWwud2lkdGhcbiAgICAgICAgQF9jYW52YXMucmVuZGVyQWxsKClcblxuICAgIGRyYXdTaWduYWxzOiAoc3RhcnQgPSBAcmVuZGVyRnJvbSwgZW5kID0gQHJlbmRlclRvKSAtPlxuICAgICAgICBAX2RyYXdTaWduYWxOYW1lcygpXG4gICAgICAgIHNpZ25hbEluZGV4ID0gLTFcbiAgICAgICAgQF9zaWduYWxWYWx1ZVRleHQgPSBbXVxuICAgICAgICBmb3IgcmVuZGVyZWQgaW4gQHJlbmRlcmVkU2lnbmFsc1xuICAgICAgICAgICAgc2lnbmFsSW5kZXgrK1xuICAgICAgICAgICAgc2lnbmFsID0gcmVuZGVyZWQuc2lnbmFsXG4gICAgICAgICAgICByYW5nZXMgPSBAX2dldFNpZ25hbFZhbHVlcyhzaWduYWwud2F2ZSwgc3RhcnQsIGVuZClcblxuICAgICAgICAgICAgc2lnbmFsQnVzID0gQGlzQnVzIHNpZ25hbC5uYW1lXG5cblxuICAgICAgICAgICAgaW5pdGlhbFZhbHVlID0gcmFuZ2VzWzBdLnZhbHVlXG5cbiAgICAgICAgICAgIG9yaWdpblggPSBTSUdOQUxfTkFNRVNfQk9YX1dJRFRIXG4gICAgICAgICAgICBvcmlnaW5ZID0gcmVuZGVyZWQueXBvc1xuICAgICAgICAgICAgaWYgaW5pdGlhbFZhbHVlIGlzICcwJyBvciBpbml0aWFsVmFsdWUgaXMgJ3gnIG9yIGluaXRpYWxWYWx1ZSBpcyAneidcbiAgICAgICAgICAgICAgICBvcmlnaW5ZICs9IFNJR05BTF9IRUlHSFRcblxuICAgICAgICAgICAgaWYgc2lnbmFsQnVzXG4gICAgICAgICAgICAgICAgb3JpZ2luWSA9IHJlbmRlcmVkLnlwb3MgKyBTSUdOQUxfSEVJR0hUIC8gMi4wXG5cbiAgICAgICAgICAgIHZhbHVlSW5kZXggPSAwXG5cbiAgICAgICAgICAgIGZvciB2YWx1ZU9iamVjdCBpbiByYW5nZXNcbiAgICAgICAgICAgICAgICB2YWx1ZU9iamVjdC53aWR0aCA9IHJlbmRlcmVkLndpZHRoXG4gICAgICAgICAgICAgICAgaWYgdmFsdWVJbmRleCBpcyByYW5nZXMubGVuZ3RoIC0gMVxuICAgICAgICAgICAgICAgICAgICB2YWx1ZU9iamVjdC5sYXN0ID0geWVzXG4gICAgICAgICAgICAgICAgW29yaWdpblgsIG9yaWdpblksIGluaXRpYWxWYWx1ZV0gPSBAX2RyYXdWYWx1ZSB2YWx1ZU9iamVjdCwgb3JpZ2luWCwgb3JpZ2luWSwgaW5pdGlhbFZhbHVlLCBERUZBVUxUX0NPTE9SLlNJR05BTCwgKHNpZ25hbEJ1cyBpc250IG5vKVxuICAgICAgICAgICAgICAgIHZhbHVlSW5kZXgrK1xuXG4gICAgICAgICAgICBoaWdobGlnaHRSZWN0ID0gbmV3IGZhYnJpYy5SZWN0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGVmdDogMlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvcDogcmVuZGVyZWQueXBvcyAtIDFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IFNJR05BTF9IRUlHSFQgKyAzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IEBjYW52YXNXaWR0aFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGw6IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wYWNpdHk6IDBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RhYmxlOiBub1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc0NvbnRyb2xzOiBub1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc1JvdGF0aW5nUG9pbnQ6IG5vXG5cbiAgICAgICAgICAgIGhpZ2hsaWdodFJlY3Quc2lnbmFsID0gcmVuZGVyZWRcbiAgICAgICAgICAgIHJlbmRlcmVkLmhpZ2hsaWdodCA9IGhpZ2hsaWdodFJlY3RcbiAgICAgICAgICAgIHJlbmRlcmVkLmN1cnJlbnRWYWx1ZSA9IHJhbmdlc1swXS52YWx1ZVxuICAgICAgICAgICAgY3VycmVudFZhbHVlVGV4dCA9IEBfZ2V0Rm9ybWF0dGVkVmFsdWUocmFuZ2VzWzBdLnZhbHVlLCByYW5nZXNbMF0ud2lkdGgpXG4gICAgICAgICAgICBAX3NpZ25hbEN1cnJlbnRWYWx1ZXNbc2lnbmFsSW5kZXhdLnNldFRleHQgY3VycmVudFZhbHVlVGV4dFxuICAgICAgICAgICAgY3VycmVudFZhbHVlV2lkdGggPSBAX3NpZ25hbEN1cnJlbnRWYWx1ZXNbc2lnbmFsSW5kZXhdLndpZHRoXG4gICAgICAgICAgICBjdXJyZW50VmFsdWVTcGFuV2lkdGggPSBNYXRoLmFicyhTSUdOQUxfTkFNRVNfQk9YX1dJRFRIIC0gU0lHTkFMX0JPWF9XSURUSCAtIDEwKVxuICAgICAgICAgICAgb3ZlcmZsb3dXaWR0aCA9IGN1cnJlbnRWYWx1ZVdpZHRoID4gY3VycmVudFZhbHVlU3BhbldpZHRoXG4gICAgICAgICAgICB3aGlsZSBjdXJyZW50VmFsdWVXaWR0aCA+IGN1cnJlbnRWYWx1ZVNwYW5XaWR0aFxuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZVRleHQgPSBjdXJyZW50VmFsdWVUZXh0LnN1YnN0ciAwLCBjdXJyZW50VmFsdWVUZXh0Lmxlbmd0aCAtIDFcbiAgICAgICAgICAgICAgICBAX3NpZ25hbEN1cnJlbnRWYWx1ZXNbc2lnbmFsSW5kZXhdLnNldFRleHQgY3VycmVudFZhbHVlVGV4dFxuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZVdpZHRoID0gQF9zaWduYWxDdXJyZW50VmFsdWVzW3NpZ25hbEluZGV4XS53aWR0aFxuICAgICAgICAgICAgaWYgb3ZlcmZsb3dXaWR0aFxuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZVdpZHRoID0gY3VycmVudFZhbHVlV2lkdGggKyAnLi4nXG4gICAgICAgICAgICBAX2NhbnZhcy5hZGQgQF9zaWduYWxDdXJyZW50VmFsdWVzW3NpZ25hbEluZGV4XVxuICAgICAgICAgICAgQF9jYW52YXMuYWRkIGhpZ2hsaWdodFJlY3RcblxuICAgICAgICBAX2NhbnZhcy5icmluZ1RvRnJvbnQgQF9jdXJyZW50VmFsdWVMaW5lU3RhcnRcbiAgICAgICAgQF9jYW52YXMuYnJpbmdUb0Zyb250IEBfY3VycmVudFZhbHVlTGluZUVuZFxuICAgICAgICBAX2NhbnZhcy5yZW5kZXJBbGwoKVxuXG4gICAgcmVmcmVzaEN1cnJlbnRWYWx1ZXM6IC0+XG4gICAgICAgIHNpZ25hbEluZGV4ID0gMFxuICAgICAgICBmb3IgcmVuZGVyZWQgaW4gQHJlbmRlcmVkU2lnbmFsc1xuICAgICAgICAgICAgc2lnbmFsID0gcmVuZGVyZWQuc2lnbmFsXG4gICAgICAgICAgICB3YXZlID0gc2lnbmFsLndhdmVcbiAgICAgICAgICAgIGluZCA9IDBcbiAgICAgICAgICAgIGZvciB2YWx1ZSBpbiB3YXZlXG4gICAgICAgICAgICAgICAgaWYgQGN1cnJlbnRUaW1lID49IE51bWJlci5wYXJzZUludCB2YWx1ZVswXVxuICAgICAgICAgICAgICAgICAgICBpZiBpbmQgaXMgd2F2ZS5sZW5ndGggLSAxIG9yIEBjdXJyZW50VGltZSA8PSBOdW1iZXIucGFyc2VJbnQgd2F2ZVtpbmQgKyAxXVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyZWQuY3VycmVudFZhbHVlID0gdmFsdWVbMV1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICAgICAgaW5kKytcbiAgICAgICAgICAgIGN1cnJlbnRWYWx1ZVRleHQgPSBAX2dldEZvcm1hdHRlZFZhbHVlKHJlbmRlcmVkLmN1cnJlbnRWYWx1ZSwgcmVuZGVyZWQud2lkdGgpXG4gICAgICAgICAgICBAX3NpZ25hbEN1cnJlbnRWYWx1ZXNbc2lnbmFsSW5kZXhdLnNldFRleHQgY3VycmVudFZhbHVlVGV4dFxuICAgICAgICAgICAgY3VycmVudFZhbHVlV2lkdGggPSBAX3NpZ25hbEN1cnJlbnRWYWx1ZXNbc2lnbmFsSW5kZXhdLndpZHRoXG4gICAgICAgICAgICBjdXJyZW50VmFsdWVTcGFuV2lkdGggPSBNYXRoLmFicyhTSUdOQUxfTkFNRVNfQk9YX1dJRFRIIC0gU0lHTkFMX0JPWF9XSURUSCAtIDE0KVxuICAgICAgICAgICAgb3ZlcmZsb3dXaWR0aCA9IGN1cnJlbnRWYWx1ZVdpZHRoID4gY3VycmVudFZhbHVlU3BhbldpZHRoXG4gICAgICAgICAgICB3aGlsZSBjdXJyZW50VmFsdWVXaWR0aCA+IGN1cnJlbnRWYWx1ZVNwYW5XaWR0aFxuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZVRleHQgPSBjdXJyZW50VmFsdWVUZXh0LnN1YnN0ciAwLCBjdXJyZW50VmFsdWVUZXh0Lmxlbmd0aCAtIDFcbiAgICAgICAgICAgICAgICBAX3NpZ25hbEN1cnJlbnRWYWx1ZXNbc2lnbmFsSW5kZXhdLnNldFRleHQgY3VycmVudFZhbHVlVGV4dFxuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZVdpZHRoID0gQF9zaWduYWxDdXJyZW50VmFsdWVzW3NpZ25hbEluZGV4XS53aWR0aFxuICAgICAgICAgICAgaWYgb3ZlcmZsb3dXaWR0aFxuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZVdpZHRoID0gY3VycmVudFZhbHVlV2lkdGggKyAnLi4nXG4gICAgICAgICAgICBzaWduYWxJbmRleCsrXG4gICAgICAgIEBfY2FudmFzLnJlbmRlckFsbCgpXG5cblxuICAgIGFkZFNpZ25hbDogLT5cbiAgICAgICAgb3B0aW9ucyA9IFwiXCJcbiAgICAgICAgaW5kZXggPSAwXG4gICAgICAgIGZvciByZW1vdmVkU2lnbmFsIGluIEByZW1vdmVkU2lnbmFsc1xuICAgICAgICAgICAgb3B0aW9ucyA9IFwiI3tvcHRpb25zfTxsaSBjbGFzcz1cXFwidWktd2lkZ2V0LWNvbnRlbnRcXFwiIHZhbHVlPVxcXCIje2luZGV4fVxcXCI+I3tyZW1vdmVkU2lnbmFsLnNpZ25hbC5uYW1lfTwvbGk+XFxuXCJcbiAgICAgICAgICAgIGluZGV4KytcblxuICAgICAgICBzZWxlY3RhYmxlSWQgPSBcIiN7QF9jb250YWluZXJJZH0td2F2ZWZvcm0tYWRkLXNpZ25hbC1zZWxlY3RcIlxuICAgICAgICBkaWFsb2dUaXRsZSA9IFwiQWRkIFNpZ25hbHNcIlxuICAgICAgICBkaWFsb2dNZXNzYWdlID0gXCI8b2wgaWQ9XFxcIiN7c2VsZWN0YWJsZUlkfVxcXCIgY2xhc3M9XFxcInVpLXdpZGdldCB1aS1jb3JuZXItYWxsIHdhdmVmb3JtLWFkZC1zaWduYWwtc2VsZWN0XFxcIiBtdWx0aXBsZT5cXG4je29wdGlvbnN9PC9zZWxlY3Q+XCJcbiAgICAgICAgJChcIiMje0BfbW9kYWxEaWFsb2dJZH1cIikuaHRtbCBkaWFsb2dNZXNzYWdlXG4gICAgICAgICQoXCIjI3tzZWxlY3RhYmxlSWR9XCIpLnNlbGVjdGFibGUoKVxuICAgICAgICAkKFwiIyN7QF9tb2RhbERpYWxvZ0lkfVwiKS5kaWFsb2dcbiAgICAgICAgICAgIHJlc2l6YWJsZTogbm9cbiAgICAgICAgICAgIG1vZGFsOiB5ZXNcbiAgICAgICAgICAgIHRpdGxlOiBkaWFsb2dUaXRsZVxuICAgICAgICAgICAgaGVpZ2h0OiA0MDAsXG4gICAgICAgICAgICB3aWR0aDogMzAwLFxuICAgICAgICAgICAgYnV0dG9uczpcbiAgICAgICAgICAgICAgICAnQWRkJzogPT5cbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQgPSAkKFwiIyN7c2VsZWN0YWJsZUlkfSAudWktc2VsZWN0ZWRcIilcbiAgICAgICAgICAgICAgICAgICAgcm1JbmRpY2VzID0gW11cbiAgICAgICAgICAgICAgICAgICAgZm9yIHNlbGVjdGlvbiBpbiBzZWxlY3RlZFxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0aW9uSW5kZXggPSAkKHNlbGVjdGlvbikudmFsKClcbiAgICAgICAgICAgICAgICAgICAgICAgIHVubGVzcyBzZWxlY3Rpb25JbmRleCBpbiBAaW5jbHVkZWRTaWduYWxzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQHJlbmRlcmVkU2lnbmFscy5wdXNoIEByZW1vdmVkU2lnbmFsc1tzZWxlY3Rpb25JbmRleF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBybUluZGljZXMucHVzaCBzZWxlY3Rpb25JbmRleFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEBleGNsdWRlZFNpZ25hbHMuc3BsaWNlIEBleGNsdWRlZFNpZ25hbHMuaW5kZXhPZiBzZWxlY3Rpb25JbmRleCwgMVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEBpbmNsdWRlZFNpZ25hbHMucHVzaCBzZWxlY3Rpb25JbmRleFxuICAgICAgICAgICAgICAgICAgICBybUluZGljZXMuc29ydCgpXG4gICAgICAgICAgICAgICAgICAgIHJtQ291bnRlciA9IDBcbiAgICAgICAgICAgICAgICAgICAgZm9yIGluZCBpbiBybUluZGljZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIEByZW1vdmVkU2lnbmFscy5zcGxpY2UgaW5kIC0gcm1Db3VudGVyLCAxXG4gICAgICAgICAgICAgICAgICAgICAgICBybUNvdW50ZXIrK1xuICAgICAgICAgICAgICAgICAgICBAcmVkcmF3KCkgaWYgcm1JbmRpY2VzLmxlbmd0aFxuICAgICAgICAgICAgICAgICAgICAkKFwiIyN7QF9tb2RhbERpYWxvZ0lkfVwiKS5kaWFsb2coJ2Nsb3NlJylcbiAgICAgICAgICAgICAgICAgICAgaWYgQF9vbkNoYW5nZUxpc3RlbmVyXG4gICAgICAgICAgICAgICAgICAgICAgICBAX29uQ2hhbmdlTGlzdGVuZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhZGQnXG4gICAgICAgICAgICAgICAgJ0NhbmNlbCc6IC0+XG4gICAgICAgICAgICAgICAgICAgICQoQCkuZGlhbG9nKCdjbG9zZScpXG4gICAgICAgICAgICBjbG9zZTogPT5cbiAgICAgICAgICAgICAgICAkKFwiIyN7QF9tb2RhbERpYWxvZ0lkfVwiKS5odG1sICcnXG5cbiAgICByZW1vdmVTaWduYWw6IC0+XG4gICAgICAgIHJldHVybiB1bmxlc3MgQGhpZ2hsaWdodGVkXG4gICAgICAgIHNpZ25hbEluZGV4ID0gQHJlbmRlcmVkU2lnbmFscy5pbmRleE9mIEBoaWdobGlnaHRlZC5zaWduYWxcbiAgICAgICAgc2lnbmFsID0gQGhpZ2hsaWdodGVkLnNpZ25hbC5zaWduYWxcbiAgICAgICAgc2lnbmFsTmFtZSA9IHNpZ25hbC5uYW1lXG4gICAgICAgIGRpYWxvZ1RpdGxlID0gXCJSZW1vdmUgU2lnbmFsICN7c2lnbmFsTmFtZX0/XCJcbiAgICAgICAgZGlhbG9nTWVzc2FnZSA9IFwiPHA+PHNwYW4gY2xhc3M9XFxcInVpLWljb24gdWktaWNvbi1hbGVydFxcXCIgc3R5bGU9XFxcImZsb2F0OmxlZnQ7IG1hcmdpbjowIDdweCAyMHB4IDA7XFxcIj48L3NwYW4+RG8geW91IHdhbnQgdG8gcmVtb3ZlIHRoZSBzZWxlY3RlZCBzaWduYWw/PC9wPlwiXG4gICAgICAgICQoXCIjI3tAX21vZGFsRGlhbG9nSWR9XCIpLmh0bWwgZGlhbG9nTWVzc2FnZVxuICAgICAgICAkKFwiIyN7QF9tb2RhbERpYWxvZ0lkfVwiKS5kaWFsb2dcbiAgICAgICAgICAgIHJlc2l6YWJsZTogbm9cbiAgICAgICAgICAgIG1vZGFsOiB5ZXNcbiAgICAgICAgICAgIHRpdGxlOiBkaWFsb2dUaXRsZVxuICAgICAgICAgICAgaGVpZ2h0OiAxNTAsXG4gICAgICAgICAgICB3aWR0aDogMzIwLFxuICAgICAgICAgICAgYnV0dG9uczpcbiAgICAgICAgICAgICAgICAnUmVtb3ZlJzogPT5cbiAgICAgICAgICAgICAgICAgICAgaWYgQGhpZ2hsaWdodGVkXG4gICAgICAgICAgICAgICAgICAgICAgICBAaGlnaGxpZ2h0ZWQuZmlsbCA9IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICAgICAgQGhpZ2hsaWdodGVkLm9wYWNpdHkgPSAwXG4gICAgICAgICAgICAgICAgICAgIEBoaWdobGlnaHRlZCA9IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICBAaGlnaGxpZ2h0ZWRJbmRleCA9IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICB1bmxlc3Mgc2lnbmFsSW5kZXggaW4gQGV4Y2x1ZGVkU2lnbmFsc1xuICAgICAgICAgICAgICAgICAgICAgICAgQHJlbW92ZWRTaWduYWxzLnB1c2ggQHJlbmRlcmVkU2lnbmFsc1tzaWduYWxJbmRleF1cbiAgICAgICAgICAgICAgICAgICAgICAgIEByZW5kZXJlZFNpZ25hbHMuc3BsaWNlIHNpZ25hbEluZGV4LCAxXG4gICAgICAgICAgICAgICAgICAgICAgICBAZXhjbHVkZWRTaWduYWxzLnB1c2ggc2lnbmFsSW5kZXhcbiAgICAgICAgICAgICAgICAgICAgICAgIEBpbmNsdWRlZFNpZ25hbHMuc3BsaWNlIEBpbmNsdWRlZFNpZ25hbHMuaW5kZXhPZiBzaWduYWxJbmRleCwgMVxuICAgICAgICAgICAgICAgICAgICAgICAgQHJlZHJhdygpXG4gICAgICAgICAgICAgICAgICAgICQoXCIjI3tAX21vZGFsRGlhbG9nSWR9XCIpLmRpYWxvZygnY2xvc2UnKVxuICAgICAgICAgICAgICAgICAgICBpZiBAX29uQ2hhbmdlTGlzdGVuZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIEBfb25DaGFuZ2VMaXN0ZW5lclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlbW92ZSdcbiAgICAgICAgICAgICAgICAnQ2FuY2VsJzogLT5cbiAgICAgICAgICAgICAgICAgICAgJChAKS5kaWFsb2coJ2Nsb3NlJylcbiAgICAgICAgICAgIGNsb3NlOiA9PlxuICAgICAgICAgICAgICAgICQoXCIjI3tAX21vZGFsRGlhbG9nSWR9XCIpLmh0bWwgJydcblxuICAgIG1vdmVGaXJzdDogLT5cbiAgICAgICAgcmV0dXJuIGlmIEByZW5kZXJGcm9tIGlzIDBcbiAgICAgICAgQHJlbmRlckZyb20gPSAwXG4gICAgICAgIEByZW5kZXJUbyA9IEByZW5kZXJGcm9tICsgQF9yZW5kZXJEaXN0XG4gICAgICAgIEByZW5kZXJUbyA9IEBlbmRUaW1lIGlmIEByZW5kZXJUbyA+IEBlbmRUaW1lXG4gICAgICAgIEByZWRyYXcoKVxuICAgICAgICBAc2V0Q3Vyc29yVGltZSBAY3VycmVudEV4YWN0VGltZVxuXG4gICAgbW92ZUxlZnQ6IC0+XG4gICAgICAgIHJldHVybiBpZiBAcmVuZGVyRnJvbSBpcyAwXG4gICAgICAgIGZhY3RvciA9IE1hdGguZmxvb3IgQF9yZW5kZXJEaXN0IC8gOC4wXG4gICAgICAgIG5ld0Zyb20gPSBAcmVuZGVyRnJvbSAtIGZhY3RvclxuICAgICAgICBuZXdGcm9tID0gMCBpZiBuZXdGcm9tIDwgMFxuICAgICAgICBuZXdUbyA9IG5ld0Zyb20gKyBAX3JlbmRlckRpc3RcbiAgICAgICAgbmV3VG8gPSBAZW5kVGltZSBpZiBuZXdUbyA+IEBlbmRUaW1lXG4gICAgICAgIEByZW5kZXJGcm9tID0gbmV3RnJvbVxuICAgICAgICBAcmVuZGVyVG8gPSBuZXdUb1xuICAgICAgICBAcmVkcmF3KClcbiAgICAgICAgQHNldEN1cnNvclRpbWUgQGN1cnJlbnRFeGFjdFRpbWVcblxuICAgIG1vdmVSaWdodDogLT5cbiAgICAgICAgcmV0dXJuIGlmIEByZW5kZXJUbyBpcyBAZW5kVGltZVxuICAgICAgICBmYWN0b3IgPSBNYXRoLmZsb29yIEBfcmVuZGVyRGlzdCAvIDguMFxuICAgICAgICBuZXdUbyA9IEByZW5kZXJUbyArIGZhY3RvclxuICAgICAgICBuZXdUbyA9IEBlbmRUaW1lIGlmIG5ld1RvID4gQGVuZFRpbWVcbiAgICAgICAgbmV3RnJvbSA9IG5ld1RvIC0gQF9yZW5kZXJEaXN0XG4gICAgICAgIG5ld0Zyb20gPSAwIGlmIG5ld0Zyb20gPCAwXG4gICAgICAgIEByZW5kZXJGcm9tID0gbmV3RnJvbVxuICAgICAgICBAcmVuZGVyVG8gPSBuZXdUb1xuICAgICAgICBAcmVkcmF3KClcbiAgICAgICAgQHNldEN1cnNvclRpbWUgQGN1cnJlbnRFeGFjdFRpbWVcblxuICAgIHpvb21JbjogLT5cbiAgICAgICAgZmFjdG9yID0gTWF0aC5mbG9vciBAX3JlbmRlckRpc3QgLyA0LjBcbiAgICAgICAgbmV3RnJvbSA9IEByZW5kZXJGcm9tICsgZmFjdG9yXG4gICAgICAgIG5ld1RvID0gQHJlbmRlclRvIC0gZmFjdG9yXG4gICAgICAgIGlmIEBfY3Vyc29yP1xuICAgICAgICAgICAgY3Vyc29yVGltZSA9IE1hdGgucm91bmQgQF9jdXJzb3IudGltZVxuICAgICAgICAgICAgaWYgY3Vyc29yVGltZSAtIGZhY3RvciA8IEByZW5kZXJGcm9tXG4gICAgICAgICAgICAgICAgbmV3RnJvbSA9IEByZW5kZXJGcm9tXG4gICAgICAgICAgICAgICAgbmV3VG8gPSBAcmVuZGVyVG8gLSAyICogZmFjdG9yXG4gICAgICAgICAgICBlbHNlIGlmIGN1cnNvclRpbWUgKyBmYWN0b3IgPiBAcmVuZGVyVG9cbiAgICAgICAgICAgICAgICBuZXdGcm9tID0gQHJlbmRlckZyb20gKyAyICogZmFjdG9yXG4gICAgICAgICAgICAgICAgbmV3VG8gPSBAcmVuZGVyVG9cbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBuZXdGcm9tID0gY3Vyc29yVGltZSAtIGZhY3RvclxuICAgICAgICAgICAgICAgIG5ld1RvID0gY3Vyc29yVGltZSArIGZhY3RvclxuXG4gICAgICAgIHJldHVybiBpZiBuZXdGcm9tID4gbmV3VG8gb3IgbmV3VG8gPCAwIG9yIG5ld0Zyb20gPj0gbmV3VG9cbiAgICAgICAgbmV3RGlzdGFuY2UgPSBuZXdUbyAtIG5ld0Zyb21cbiAgICAgICAgQHNjYWxlRmFjdG9yID0gbmV3RGlzdGFuY2UgLyBAb3JpZ2luYWxFbmRUaW1lXG4gICAgICAgIHJldHVybiBpZiBAc2NhbGVGYWN0b3IgPCAwLjA4XG4gICAgICAgIGlmIGZhY3RvclxuICAgICAgICAgICAgQHJlbmRlckZyb20gPSBuZXdGcm9tXG4gICAgICAgICAgICBAcmVuZGVyVG8gPSBuZXdUb1xuICAgICAgICAgICAgQHJlZHJhdygpXG4gICAgICAgICAgICBAc2V0Q3Vyc29yVGltZSBAY3VycmVudEV4YWN0VGltZVxuXG4gICAgem9vbU91dDogLT5cbiAgICAgICAgem9vbURpc3RhbmNlID0gIDIgKiBAX3JlbmRlckRpc3RcbiAgICAgICAgbmV3RnJvbSA9IHVuZGVmaW5lZFxuICAgICAgICBuZXdUbyA9IHVuZGVmaW5lZFxuICAgICAgICBpZiB6b29tRGlzdGFuY2UgPiBAb3JpZ2luYWxFbmRUaW1lXG4gICAgICAgICAgICBuZXdGcm9tID0gMFxuICAgICAgICAgICAgbmV3VG8gPSBAZW5kVGltZVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBmYWN0b3IgPSBNYXRoLmZsb29yIEBfcmVuZGVyRGlzdCAvIDIuMFxuICAgICAgICAgICAgbmV3RnJvbSA9IEByZW5kZXJGcm9tIC0gZmFjdG9yXG4gICAgICAgICAgICBuZXdUbyA9IEByZW5kZXJUbyArIGZhY3RvclxuICAgICAgICAgICAgaWYgbmV3VG8gPiBAZW5kVGltZVxuICAgICAgICAgICAgICAgIG5ld1RvID0gQGVuZFRpbWVcbiAgICAgICAgICAgICAgICBuZXdGcm9tID0gbmV3VG8gLSB6b29tRGlzdGFuY2VcbiAgICAgICAgICAgIGlmIG5ld0Zyb20gPCAwXG4gICAgICAgICAgICAgICAgbmV3RnJvbSA9IDBcblxuICAgICAgICBuZXdEaXN0YW5jZSA9IG5ld1RvIC0gbmV3RnJvbVxuICAgICAgICBAc2NhbGVGYWN0b3IgPSBuZXdEaXN0YW5jZSAvIEBvcmlnaW5hbEVuZFRpbWVcblxuICAgICAgICBAcmVuZGVyRnJvbSA9IG5ld0Zyb21cbiAgICAgICAgQHJlbmRlclRvID0gbmV3VG9cbiAgICAgICAgQHJlZHJhdygpXG4gICAgICAgIEBzZXRDdXJzb3JUaW1lIEBjdXJyZW50RXhhY3RUaW1lXG5cbiAgICB6b29tQWxsOiAtPlxuICAgICAgICByZXR1cm4gaWYgQHJlbmRlckZyb20gaXMgMCBhbmQgQHJlbmRlclRvIGlzIEBlbmRUaW1lXG4gICAgICAgIEByZW5kZXJGcm9tID0gMFxuICAgICAgICBAcmVuZGVyVG8gPSBAZW5kVGltZVxuICAgICAgICBAcmVkcmF3KClcbiAgICAgICAgQHNldEN1cnNvclRpbWUgQGN1cnJlbnRFeGFjdFRpbWVcblxuICAgIHNldFJhZGl4OiAobmV3UmFkaXgpIC0+XG4gICAgICAgIHJldHVybiB1bmxlc3MgbmV3UmFkaXggaW4gW1JBRElYX0JJTiwgUkFESVhfREVDLCBSQURJWF9IRVhdXG4gICAgICAgIEByYWRpeCA9IG5ld1JhZGl4XG4gICAgICAgIEByZWZyZXNoQ3VycmVudFZhbHVlcygpXG4gICAgICAgIEByZWZyZXNoU2lnbmFsVmFsdWVzKClcblxuICAgIGlzQnVzOiAoc2lnbmFsTmFtZSkgLT5cbiAgICAgICAgbWF0Y2hlcyA9IC9bXFxzXFxTXStcXFsoXFxkKylcXDooXFxkKylcXF1cXHMqLy5leGVjIHNpZ25hbE5hbWVcbiAgICAgICAgdW5sZXNzIG1hdGNoZXM/XG4gICAgICAgICAgICBub1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBzdGFydDogbWF0Y2hlc1sxXVxuICAgICAgICAgICAgZW5kOiBtYXRjaGVzWzJdXG5cbiAgICBjbGVhckNhbnZhczogLT5cbiAgICAgICAgQF9jYW52YXMuY2xlYXIoKVxuXG4gICAgYmluVG9EZWM6ICh2YWx1ZSkgLT5cbiAgICAgICAgTnVtYmVyLnBhcnNlSW50KHZhbHVlLCAyKS50b1N0cmluZygxMClcblxuICAgIGJpblRvSGV4OiAodmFsdWUpIC0+XG4gICAgICAgIE51bWJlci5wYXJzZUludCh2YWx1ZSwgMikudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKClcblxuICAgIHBhZDogKHZhbHVlLCB3aWR0aCwgcGFkZGluZyA9ICcwJykgLT5cbiAgICAgICAgdmFsdWUgPSB2YWx1ZSArICcnXG4gICAgICAgIGlmIHZhbHVlLmxlbmd0aCA+PSB3aWR0aCB0aGVuIHZhbHVlIGVsc2UgbmV3IEFycmF5KHdpZHRoIC0gdmFsdWUubGVuZ3RoICsgMSkuam9pbihwYWRkaW5nKSArIHZhbHVlXG5cbiAgICBwb2ludERpc3Q6ICh4MSwgeTEsIHgyLCB5MikgLT5cbiAgICAgICAgTWF0aC5zcXJ0IE1hdGgucG93KHgyIC0geDEsIDIpICsgTWF0aC5wb3coeTIgLSB5MSwgMilcblxuICAgIGdldFJhbmRvbUNvbG9yOiAtPlxuICAgICAgICBsZXR0ZXJzID0gJzAxMjM0NTY3ODlBQkNERUYnLnNwbGl0ICcnXG4gICAgICAgIGNvbG9yID0gJyMnXG4gICAgICAgIGZvciBpIGluIFswLi4uNl1cbiAgICAgICAgICAgIGNvbG9yICs9IGxldHRlcnNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTYpXVxuICAgICAgICBjb2xvclxuXG5cbiAgICBjZWlsSW50OiAodmFsdWUsIGRpdmlzKSAtPlxuICAgICAgICB2YWx1ZSA9IE1hdGgucm91bmQgdmFsdWVcbiAgICAgICAgd2hpbGUgdmFsdWUgJSBkaXZpc1xuICAgICAgICAgICAgdmFsdWUrK1xuICAgICAgICB2YWx1ZVxuXG4gICAgZmxvb3JJbnQ6ICh2YWx1ZSwgZGl2aXMpIC0+XG4gICAgICAgIHZhbHVlID0gTWF0aC5yb3VuZCB2YWx1ZVxuICAgICAgICB3aGlsZSB2YWx1ZSAlIGRpdmlzXG4gICAgICAgICAgICB2YWx1ZS0tXG4gICAgICAgIHZhbHVlXG5cbiAgICByb3VuZEludDogKHZhbHVlLCAgZGl2aXMpIC0+XG4gICAgICAgIHZhbHVlID0gTWF0aC5yb3VuZCB2YWx1ZVxuICAgICAgICByZXR1cm4gdmFsdWUgdW5sZXNzIHZhbHVlICUgZGl2aXNcbiAgICAgICAgY2VpbFZhbHVlID0gdmFsdWVcbiAgICAgICAgZmxvb3JWYWx1ZSA9IHZhbHVlXG4gICAgICAgIHdoaWxlIGNlaWxWYWx1ZSAlIGRpdmlzIGFuZCBmbG9vclZhbHVlICUgZGl2aXNcbiAgICAgICAgICAgIGNlaWxWYWx1ZSsrXG4gICAgICAgICAgICBmbG9vclZhbHVlLS1cbiAgICAgICAgaWYgY2VpbFZhbHVlICUgZGl2aXMgdGhlbiBmbG9vclZhbHVlIGVsc2UgY2VpbFZhbHVlXG5cbiAgICBjZWlsRml2ZTogKHZhbHVlKSAtPlxuICAgICAgICBAY2VpbEludCB2YWx1ZSwgNVxuXG4gICAgZmxvb3JGaXZlOiAodmFsdWUpIC0+XG4gICAgICAgIEBmbG9vckludCB2YWx1ZSwgNVxuXG4gICAgcm91bmRGaXZlOiAodmFsdWUpIC0+XG4gICAgICAgIEByb3VuZEludCB2YWx1ZSwgNVxuXG4gICAgX2luaXRDYW52YXM6IC0+XG4gICAgICAgIEBfY2FudmFzID0gbmV3IGZhYnJpYy5DYW52YXMgQF9jYW52YXNJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBAY2FudmFzV2lkdGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogQGNhbnZhc0hlaWdodFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBERUZBVUxUX0NPTE9SLkNBTlZBU19CQUNLR1JPVU5EXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJPbkFkZFJlbW92ZTogbm9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGlvbjogbm9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlZnVsOiBub1xuICAgICAgICBAX2NvbnRleHQgPSBAX2NhbnZhcy5nZXRDb250ZXh0ICcyZCdcbiAgICAgICAgQF9pc0RyYWdnaW5nID0gbm9cbiAgICAgICAgQF9kcmFnZ2VkU2lnbmFsID0gdW5kZWZpbmVkXG4gICAgICAgIEBfZHJhZ2dlZE9yaWdpbmFsWCA9IHVuZGVmaW5lZFxuICAgICAgICBAX2RyYWdnZWRPcmlnaW5hbFkgPSB1bmRlZmluZWRcbiAgICAgICAgQF9kcmFnZ2VkTW91c2VYID0gdW5kZWZpbmVkXG4gICAgICAgIEBfZHJhZ2dlZE1vdXNlWSA9IHVuZGVmaW5lZFxuICAgICAgICBAX2RyYWdSZWN0YW5nbGUgPSB1bmRlZmluZWRcbiAgICAgICAgQF9kcmFnUmVjdGFuZ2xlT3JpZ2luYWxIZWlnaHQgPSB1bmRlZmluZWRcblxuXG5cbiAgICAgICAgQF9jYW52YXMub24gJ21vdXNlOmRvd24nLCAob3B0aW9ucykgPT5cbiAgICAgICAgICAgIGlmIG9wdGlvbnMudGFyZ2V0XG4gICAgICAgICAgICAgICAgcG9pbnRlciA9IEBfY2FudmFzLmdldFBvaW50ZXIgb3B0aW9ucy5lXG4gICAgICAgICAgICAgICAgaWYgb3B0aW9ucy50YXJnZXQuc2lnbmFsXG4gICAgICAgICAgICAgICAgICAgIGlmIEBoaWdobGlnaHRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgQGhpZ2hsaWdodGVkLmZpbGwgPSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIEBoaWdobGlnaHRlZC5vcGFjaXR5ID0gMFxuICAgICAgICAgICAgICAgICAgICBAaGlnaGxpZ2h0ZWQgPSBvcHRpb25zLnRhcmdldFxuICAgICAgICAgICAgICAgICAgICBAaGlnaGxpZ2h0ZWRJbmRleCA9IEByZW5kZXJlZFNpZ25hbHMuaW5kZXhPZiBvcHRpb25zLnRhcmdldC5zaWduYWxcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy50YXJnZXQuZmlsbCA9IERFRkFVTFRfQ09MT1IuU0lHTkFMX0hJR0hMSUdIVFxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnRhcmdldC5vcGFjaXR5ID0gREVGQVVMVF9PUEFDSVRZLlNJR05BTF9ISUdITElHSFRcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIGlmIEBoaWdobGlnaHRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgQGhpZ2hsaWdodGVkLmZpbGwgPSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIEBoaWdobGlnaHRlZC5vcGFjaXR5ID0gMFxuICAgICAgICAgICAgICAgICAgICBAaGlnaGxpZ2h0ZWQgPSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgQGhpZ2hsaWdodGVkSW5kZXggPSB1bmRlZmluZWRcblxuICAgICAgICAgICAgICAgIGlmIG9wdGlvbnMudGFyZ2V0LnNpZ25hbFxuICAgICAgICAgICAgICAgICAgICBAX2RyYWdnZWRTaWduYWwgPSBvcHRpb25zLnRhcmdldFxuICAgICAgICAgICAgICAgICAgICBAX2RyYWdnZWRPcmlnaW5hbFggPSBvcHRpb25zLnRhcmdldC5sZWZ0XG4gICAgICAgICAgICAgICAgICAgIEBfZHJhZ2dlZE9yaWdpbmFsWSA9IG9wdGlvbnMudGFyZ2V0LnRvcFxuICAgICAgICAgICAgICAgICAgICBAX2RyYWdnZWRNb3VzZVggPSBwb2ludGVyLnhcbiAgICAgICAgICAgICAgICAgICAgQF9kcmFnZ2VkTW91c2VZID0gcG9pbnRlci55XG4gICAgICAgICAgICAgICAgQF9pc0RyYWdnaW5nID0geWVzXG4gICAgICAgICAgICAgICAgQF9jYW52YXMucmVuZGVyQWxsKClcbiAgICAgICAgQF9jYW52YXMub24gJ21vdXNlOm1vdmUnLCAob3B0aW9ucykgPT5cbiAgICAgICAgICAgIGlmIEBfaXNEcmFnZ2luZ1xuICAgICAgICAgICAgICAgIHBvaW50ZXIgPSBALl9jYW52YXMuZ2V0UG9pbnRlciBvcHRpb25zLmVcbiAgICAgICAgICAgICAgICBpZiBAX2RyYWdnZWRTaWduYWw/XG4gICAgICAgICAgICAgICAgICAgIEBfZHJhZ2dlZFNpZ25hbC5zZXRUb3AgKHBvaW50ZXIueSAtIEBfZHJhZ2dlZE1vdXNlWSkgKyBAX2RyYWdnZWRPcmlnaW5hbFlcbiAgICAgICAgICAgICAgICAgICAgQF9kcmFnZ2VkU2lnbmFsLm9wYWNpdHkgPSBERUZBVUxUX09QQUNJVFkuU0lHTkFMX0RSQUdHRURcbiAgICAgICAgICAgICAgICBpZiBAX2RyYWdSZWN0YW5nbGU/IGFuZCBvcHRpb25zLnRhcmdldCBpc250IEBfZHJhZ1JlY3RhbmdsZVxuICAgICAgICAgICAgICAgICAgICBAX2RyYWdSZWN0YW5nbGUuc2V0SGVpZ2h0IEBfZHJhZ1JlY3RhbmdsZU9yaWdpbmFsSGVpZ2h0XG4gICAgICAgICAgICAgICAgICAgIEBfZHJhZ1JlY3RhbmdsZU9yaWdpbmFsSGVpZ2h0ID0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICAgIEBfZHJhZ1JlY3RhbmdsZS5maWxsID0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICAgIEBfZHJhZ1JlY3RhbmdsZS5vcGFjaXR5ID0gMFxuICAgICAgICAgICAgICAgICAgICBAX2RyYWdSZWN0YW5nbGUgPSB1bmRlZmluZWRcblxuICAgICAgICAgICAgICAgIGlmIG9wdGlvbnMudGFyZ2V0IGFuZCBvcHRpb25zLnRhcmdldC5zaWduYWwgYW5kIG9wdGlvbnMudGFyZ2V0IGlzbnQgQF9kcmFnZ2VkU2lnbmFsIGFuZCBvcHRpb25zLnRhcmdldCBpc250IEBfZHJhZ1JlY3RhbmdsZVxuICAgICAgICAgICAgICAgICAgICAgICAgQF9kcmFnUmVjdGFuZ2xlID0gb3B0aW9ucy50YXJnZXRcbiAgICAgICAgICAgICAgICAgICAgICAgIEBfZHJhZ1JlY3RhbmdsZS5maWxsID0gREVGQVVMVF9DT0xPUi5TSUdOQUxfRFJBR0dFRFxuICAgICAgICAgICAgICAgICAgICAgICAgQF9kcmFnUmVjdGFuZ2xlLm9wYWNpdHkgPSBERUZBVUxUX09QQUNJVFkuU0lHTkFMX0RSQUdHRURcbiAgICAgICAgICAgICAgICAgICAgICAgIEBfZHJhZ1JlY3RhbmdsZU9yaWdpbmFsSGVpZ2h0ID0gQF9kcmFnUmVjdGFuZ2xlLmhlaWdodFxuICAgICAgICAgICAgICAgICAgICAgICAgQF9kcmFnUmVjdGFuZ2xlLnNldEhlaWdodCBAX2RyYWdSZWN0YW5nbGUuaGVpZ2h0IC8gMi4wXG4gICAgICAgICAgICAgICAgQF9jYW52YXMucmVuZGVyQWxsKClcblxuICAgICAgICBAX2NhbnZhcy5vbiAnbW91c2U6dXAnLCAob3B0aW9ucykgPT5cbiAgICAgICAgICAgIGlmIEBfaXNEcmFnZ2luZ1xuICAgICAgICAgICAgICAgIHZhbGlkVGFyZ2V0ID0gb3B0aW9ucy50YXJnZXQgYW5kIG9wdGlvbnMudGFyZ2V0LnNpZ25hbCBhbmQgQF9kcmFnZ2VkU2lnbmFsIGlzbnQgb3B0aW9ucy50YXJnZXRcbiAgICAgICAgICAgICAgICBpZiBAX2RyYWdnZWRTaWduYWw/XG4gICAgICAgICAgICAgICAgICAgIGlmIEBfZHJhZ2dlZE9yaWdpbmFsWD9cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIHZhbGlkVGFyZ2V0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgI1N3YXAgU2lnbmFsc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZUluZGV4ID0gQHJlbmRlcmVkU2lnbmFscy5pbmRleE9mIEBfZHJhZ2dlZFNpZ25hbC5zaWduYWxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRJbmRleCA9IEByZW5kZXJlZFNpZ25hbHMuaW5kZXhPZiBvcHRpb25zLnRhcmdldC5zaWduYWxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBAcmVuZGVyZWRTaWduYWxzLnNwbGljZSh0YXJnZXRJbmRleCwgMCwgQHJlbmRlcmVkU2lnbmFscy5zcGxpY2Uoc291cmNlSW5kZXgsIDEpWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBAX2RyYWdnZWRTaWduYWwuc2V0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZWZ0OiBAX2RyYWdnZWRPcmlnaW5hbFhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvcDogQF9kcmFnZ2VkT3JpZ2luYWxZXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgQF9kcmFnUmVjdGFuZ2xlP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBAX2RyYWdSZWN0YW5nbGUuc2V0SGVpZ2h0IEBfZHJhZ1JlY3RhbmdsZU9yaWdpbmFsSGVpZ2h0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEBfZHJhZ1JlY3RhbmdsZS5maWxsID0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEBfZHJhZ1JlY3RhbmdsZU9yaWdpbmFsSGVpZ2h0ID0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEBfZHJhZ1JlY3RhbmdsZS5vcGFjaXR5ID0gMFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBAX2RyYWdSZWN0YW5nbGUgPSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBAaGlnaGxpZ2h0ZWRJbmRleCA9IHRhcmdldEluZGV4XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQHJlZHJhdygpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgQF9vbkNoYW5nZUxpc3RlbmVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEBfb25DaGFuZ2VMaXN0ZW5lclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc29ydCdcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBAX2RyYWdnZWRTaWduYWwuc2V0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZWZ0OiBAX2RyYWdnZWRPcmlnaW5hbFhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvcDogQF9kcmFnZ2VkT3JpZ2luYWxZXG5cbiAgICAgICAgICAgIGlmIEBfZHJhZ1JlY3RhbmdsZT9cbiAgICAgICAgICAgICAgICBAX2RyYWdSZWN0YW5nbGUuc2V0SGVpZ2h0IEBfZHJhZ1JlY3RhbmdsZU9yaWdpbmFsSGVpZ2h0XG4gICAgICAgICAgICAgICAgQF9kcmFnUmVjdGFuZ2xlT3JpZ2luYWxIZWlnaHQgPSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICBAX2RyYWdSZWN0YW5nbGUuZmlsbCA9IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgIEBfZHJhZ1JlY3RhbmdsZS5vcGFjaXR5ID0gMFxuICAgICAgICAgICAgICAgIEBfZHJhZ1JlY3RhbmdsZSA9IHVuZGVmaW5lZFxuICAgICAgICAgICAgQF9pc0RyYWdnaW5nID0gbm9cbiAgICAgICAgICAgIEBfZHJhZ2dlZFNpZ25hbCA9IHVuZGVmaW5lZFxuICAgICAgICAgICAgQF9kcmFnZ2VkT3JpZ2luYWxYID0gdW5kZWZpbmVkXG4gICAgICAgICAgICBAX2RyYWdnZWRPcmlnaW5hbFkgPSB1bmRlZmluZWRcbiAgICAgICAgICAgIEBfZHJhZ2dlZE1vdXNlWCA9IHVuZGVmaW5lZFxuICAgICAgICAgICAgQF9kcmFnZ2VkTW91c2VZID0gdW5kZWZpbmVkXG5cblxuICAgICAgICAgICAgcG9pbnRlciA9IEBfY2FudmFzLmdldFBvaW50ZXIgb3B0aW9ucy5lXG4gICAgICAgICAgICBpZiBwb2ludGVyLnggPiBTSUdOQUxfTkFNRVNfQk9YX1dJRFRIXG4gICAgICAgICAgICAgICAgQHNldEN1cnNvclRpbWUgQF9wb3NUb1RpbWUgcG9pbnRlci54LCBudWxsLCBub1xuXG4gICAgICAgICAgICBAX2NhbnZhcy5yZW5kZXJBbGwoKVxuXG5cbiAgICBfZHJhd1ZhbHVlOiAodmFsdWVPYmplY3QsIG9yaWdpblgsIG9yaWdpblksIGluaXRpYWxWYWx1ZSwgc2lnbmFsQ29sb3IgPSBERUZBVUxUX0NPTE9SLlNJR05BTCwgYnVzU2lnbmFsID0gbm8sIHN0YXJ0ID0gQHJlbmRlckZyb20sIGVuZCA9IEByZW5kZXJUbyktPlxuICAgICAgICB2YWx1ZSA9IHZhbHVlT2JqZWN0LnZhbHVlXG4gICAgICAgIHN0YXJ0UG9zID0gQF90aW1lVG9Qb3ModmFsdWVPYmplY3Quc3RhcnQpXG4gICAgICAgIGVuZFBvcyA9IEBfdGltZVRvUG9zKHZhbHVlT2JqZWN0LmVuZClcblxuICAgICAgICBpc0xhc3QgPSB2YWx1ZU9iamVjdC5sYXN0XG5cbiAgICAgICAgdW5sZXNzIGJ1c1NpZ25hbFxuICAgICAgICAgICAgcG9seVBvaW50cyA9IFtdXG4gICAgICAgICAgICBsYXN0UG9pbnQgPSBbXVxuICAgICAgICAgICAgcG9seUxpbmUgPSB1bmRlZmluZWRcbiAgICAgICAgICAgIGlmIGluaXRpYWxWYWx1ZSBpcyAnMCcgb3IgaW5pdGlhbFZhbHVlIGlzICd4JyBvciBpbml0aWFsVmFsdWUgaXMgJ3onXG4gICAgICAgICAgICAgICAgaWYgdmFsdWUgaXMgJzEnXG4gICAgICAgICAgICAgICAgICAgIHBvbHlQb2ludHMucHVzaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IEBfdGltZVRvUG9zKHZhbHVlT2JqZWN0LnN0YXJ0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IG9yaWdpbllcbiAgICAgICAgICAgICAgICAgICAgcG9seVBvaW50cy5wdXNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogQF90aW1lVG9Qb3ModmFsdWVPYmplY3Quc3RhcnQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogb3JpZ2luWSAtIFNJR05BTF9IRUlHSFRcbiAgICAgICAgICAgICAgICAgICAgcG9seVBvaW50cy5wdXNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogQF90aW1lVG9Qb3ModmFsdWVPYmplY3QuZW5kKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IG9yaWdpblkgLSBTSUdOQUxfSEVJR0hUXG5cbiAgICAgICAgICAgICAgICAgICAgbGFzdFBvaW50ID0gW3BvbHlQb2ludHNbcG9seVBvaW50cy5sZW5ndGggLSAxXS54LCBwb2x5UG9pbnRzW3BvbHlQb2ludHMubGVuZ3RoIC0gMV0ueV1cblxuICAgICAgICAgICAgICAgICAgICBwb2x5TGluZSA9IG5ldyBmYWJyaWMuUG9seWxpbmUgcG9seVBvaW50cyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cm9rZTogc2lnbmFsQ29sb3JcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGw6IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0YWJsZTogbm9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc0NvbnRyb2xzOiBub1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzUm90YXRpbmdQb2ludDogbm9cblxuICAgICAgICAgICAgICAgICAgICBAX2NhbnZhcy5hZGQgcG9seUxpbmVcblxuICAgICAgICAgICAgICAgIGVsc2UgaWYgdmFsdWUgaXMgJzAnXG4gICAgICAgICAgICAgICAgICAgIHBvbHlQb2ludHMucHVzaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IEBfdGltZVRvUG9zKHZhbHVlT2JqZWN0LnN0YXJ0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IG9yaWdpbllcbiAgICAgICAgICAgICAgICAgICAgcG9seVBvaW50cy5wdXNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogQF90aW1lVG9Qb3ModmFsdWVPYmplY3QuZW5kKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IG9yaWdpbllcblxuICAgICAgICAgICAgICAgICAgICBsYXN0UG9pbnQgPSBbcG9seVBvaW50c1twb2x5UG9pbnRzLmxlbmd0aCAtIDFdLngsIHBvbHlQb2ludHNbcG9seVBvaW50cy5sZW5ndGggLSAxXS55XVxuICAgICAgICAgICAgICAgICAgICBwb2x5TGluZSA9IG5ldyBmYWJyaWMuUG9seWxpbmUgcG9seVBvaW50cyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cm9rZTogc2lnbmFsQ29sb3JcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGw6IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0YWJsZTogbm9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc0NvbnRyb2xzOiBub1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzUm90YXRpbmdQb2ludDogbm9cblxuICAgICAgICAgICAgICAgICAgICBAX2NhbnZhcy5hZGQgcG9seUxpbmVcblxuICAgICAgICAgICAgICAgIGVsc2UgaWYgdmFsdWUgaXMgJ3gnXG4gICAgICAgICAgICAgICAgICAgIHBvbHlQb2ludHMucHVzaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IEBfdGltZVRvUG9zKHZhbHVlT2JqZWN0LnN0YXJ0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IG9yaWdpbllcbiAgICAgICAgICAgICAgICAgICAgcG9seVBvaW50cy5wdXNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogQF90aW1lVG9Qb3ModmFsdWVPYmplY3QuZW5kKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IG9yaWdpbllcblxuICAgICAgICAgICAgICAgICAgICBsYXN0UG9pbnQgPSBbcG9seVBvaW50c1twb2x5UG9pbnRzLmxlbmd0aCAtIDFdLngsIHBvbHlQb2ludHNbcG9seVBvaW50cy5sZW5ndGggLSAxXS55XVxuICAgICAgICAgICAgICAgICAgICBwb2x5TGluZSA9IG5ldyBmYWJyaWMuUG9seWxpbmUgcG9seVBvaW50cyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cm9rZTogREVGQVVMVF9DT0xPUi5TSUdOQUxfRENcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGw6IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0YWJsZTogbm9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc0NvbnRyb2xzOiBub1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzUm90YXRpbmdQb2ludDogbm9cblxuICAgICAgICAgICAgICAgICAgICBAX2NhbnZhcy5hZGQgcG9seUxpbmVcbiAgICAgICAgICAgICAgICBlbHNlIGlmIHZhbHVlLnRvTG93ZXJDYXNlKCkgaXMgJ3onXG4gICAgICAgICAgICAgICAgICAgIHBvbHlQb2ludHMucHVzaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IEBfdGltZVRvUG9zKHZhbHVlT2JqZWN0LnN0YXJ0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IG9yaWdpbllcbiAgICAgICAgICAgICAgICAgICAgcG9seVBvaW50cy5wdXNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogQF90aW1lVG9Qb3ModmFsdWVPYmplY3QuZW5kKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IG9yaWdpbllcblxuICAgICAgICAgICAgICAgICAgICBsYXN0UG9pbnQgPSBbcG9seVBvaW50c1twb2x5UG9pbnRzLmxlbmd0aCAtIDFdLngsIHBvbHlQb2ludHNbcG9seVBvaW50cy5sZW5ndGggLSAxXS55XVxuICAgICAgICAgICAgICAgICAgICBwb2x5TGluZSA9IG5ldyBmYWJyaWMuUG9seWxpbmUgcG9seVBvaW50cyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cm9rZTogREVGQVVMVF9DT0xPUi5TSUdOQUxfSU1QRURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGw6IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0YWJsZTogbm9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc0NvbnRyb2xzOiBub1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzUm90YXRpbmdQb2ludDogbm9cblxuICAgICAgICAgICAgICAgICAgICBAX2NhbnZhcy5hZGQgcG9seUxpbmVcblxuICAgICAgICAgICAgZWxzZSBpZiBpbml0aWFsVmFsdWUgaXMgJzEnXG4gICAgICAgICAgICAgICAgaWYgdmFsdWUgaXMgJzEnXG4gICAgICAgICAgICAgICAgICAgIHBvbHlQb2ludHMucHVzaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiBAX3RpbWVUb1Bvcyh2YWx1ZU9iamVjdC5zdGFydClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogb3JpZ2luWVxuXG4gICAgICAgICAgICAgICAgICAgIHBvbHlQb2ludHMucHVzaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiBAX3RpbWVUb1Bvcyh2YWx1ZU9iamVjdC5lbmQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IG9yaWdpbllcblxuICAgICAgICAgICAgICAgICAgICBsYXN0UG9pbnQgPSBbcG9seVBvaW50c1twb2x5UG9pbnRzLmxlbmd0aCAtIDFdLngsIHBvbHlQb2ludHNbcG9seVBvaW50cy5sZW5ndGggLSAxXS55XVxuICAgICAgICAgICAgICAgICAgICBwb2x5TGluZSA9IG5ldyBmYWJyaWMuUG9seWxpbmUgcG9seVBvaW50cyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cm9rZTogc2lnbmFsQ29sb3JcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGw6IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0YWJsZTogbm9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc0NvbnRyb2xzOiBub1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzUm90YXRpbmdQb2ludDogbm9cblxuICAgICAgICAgICAgICAgICAgICBAX2NhbnZhcy5hZGQgcG9seUxpbmVcblxuICAgICAgICAgICAgICAgIGVsc2UgaWYgdmFsdWUgaXMgJzAnXG4gICAgICAgICAgICAgICAgICAgIHBvbHlQb2ludHMucHVzaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IEBfdGltZVRvUG9zKHZhbHVlT2JqZWN0LnN0YXJ0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IG9yaWdpbllcbiAgICAgICAgICAgICAgICAgICAgcG9seVBvaW50cy5wdXNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogQF90aW1lVG9Qb3ModmFsdWVPYmplY3Quc3RhcnQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogb3JpZ2luWSArIFNJR05BTF9IRUlHSFRcbiAgICAgICAgICAgICAgICAgICAgcG9seVBvaW50cy5wdXNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogQF90aW1lVG9Qb3ModmFsdWVPYmplY3QuZW5kKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IG9yaWdpblkgKyBTSUdOQUxfSEVJR0hUXG5cbiAgICAgICAgICAgICAgICAgICAgbGFzdFBvaW50ID0gW3BvbHlQb2ludHNbcG9seVBvaW50cy5sZW5ndGggLSAxXS54LCBwb2x5UG9pbnRzW3BvbHlQb2ludHMubGVuZ3RoIC0gMV0ueV1cbiAgICAgICAgICAgICAgICAgICAgcG9seUxpbmUgPSBuZXcgZmFicmljLlBvbHlsaW5lIHBvbHlQb2ludHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJva2U6IHNpZ25hbENvbG9yXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxsOiB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGFibGU6IG5vXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNDb250cm9sczogbm9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc1JvdGF0aW5nUG9pbnQ6IG5vXG5cbiAgICAgICAgICAgICAgICAgICAgQF9jYW52YXMuYWRkIHBvbHlMaW5lXG5cbiAgICAgICAgICAgICAgICBlbHNlIGlmIHZhbHVlIGlzICd4JyBvciB2YWx1ZS50b0xvd2VyQ2FzZSgpIGlzICd6J1xuICAgICAgICAgICAgICAgICAgICBwb2x5UG9pbnRzLnB1c2hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiBAX3RpbWVUb1Bvcyh2YWx1ZU9iamVjdC5zdGFydClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiBvcmlnaW5ZXG4gICAgICAgICAgICAgICAgICAgIHBvbHlQb2ludHMucHVzaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IEBfdGltZVRvUG9zKHZhbHVlT2JqZWN0LnN0YXJ0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IG9yaWdpblkgKyBTSUdOQUxfSEVJR0hUXG4gICAgICAgICAgICAgICAgICAgIHBvbHlQb2ludHMucHVzaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IEBfdGltZVRvUG9zKHZhbHVlT2JqZWN0LmVuZClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiBvcmlnaW5ZICsgU0lHTkFMX0hFSUdIVFxuXG4gICAgICAgICAgICAgICAgICAgIGxhc3RQb2ludCA9IFtwb2x5UG9pbnRzW3BvbHlQb2ludHMubGVuZ3RoIC0gMV0ueCwgcG9seVBvaW50c1twb2x5UG9pbnRzLmxlbmd0aCAtIDFdLnldXG4gICAgICAgICAgICAgICAgICAgIHBvbHlMaW5lID0gbmV3IGZhYnJpYy5Qb2x5bGluZSBwb2x5UG9pbnRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Ryb2tlOiBzaWduYWxDb2xvclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsbDogdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RhYmxlOiBub1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzQ29udHJvbHM6IG5vXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNSb3RhdGluZ1BvaW50OiBub1xuXG4gICAgICAgICAgICAgICAgICAgIEBfY2FudmFzLmFkZCBwb2x5TGluZVxuXG5cbiAgICAgICAgICAgIHJldHVybiBbbGFzdFBvaW50WzBdLCBsYXN0UG9pbnRbMV0sIHZhbHVlLCBwb2x5TGluZV1cbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcG9seVBvaW50cyA9IFtdXG4gICAgICAgICAgICBsYXN0UG9pbnQgPSBbXVxuICAgICAgICAgICAgcG9pbnRzVGltZSA9IERhdGUubm93KClcbiAgICAgICAgICAgIHBvbHlQb2ludHMucHVzaFxuICAgICAgICAgICAgICAgICAgICB4OiBAX3RpbWVUb1Bvcyh2YWx1ZU9iamVjdC5zdGFydCkgKyBTSUdOQUxfQlVTX1NMT1BFXG4gICAgICAgICAgICAgICAgICAgIHk6IG9yaWdpblkgKyBTSUdOQUxfSEVJR0hUIC8gMi4wXG4gICAgICAgICAgICBwb2x5UG9pbnRzLnB1c2hcbiAgICAgICAgICAgICAgICAgICAgeDogQF90aW1lVG9Qb3ModmFsdWVPYmplY3Quc3RhcnQpXG4gICAgICAgICAgICAgICAgICAgIHk6IG9yaWdpbllcbiAgICAgICAgICAgIHBvbHlQb2ludHMucHVzaFxuICAgICAgICAgICAgICAgICAgICB4OiBAX3RpbWVUb1Bvcyh2YWx1ZU9iamVjdC5zdGFydCkgKyBTSUdOQUxfQlVTX1NMT1BFXG4gICAgICAgICAgICAgICAgICAgIHk6IG9yaWdpblkgLSBTSUdOQUxfSEVJR0hUIC8gMi4wXG4gICAgICAgICAgICBwb2x5UG9pbnRzLnB1c2hcbiAgICAgICAgICAgICAgICAgICAgeDogQF90aW1lVG9Qb3ModmFsdWVPYmplY3QuZW5kKSAtIFNJR05BTF9CVVNfU0xPUEVcbiAgICAgICAgICAgICAgICAgICAgeTogb3JpZ2luWSAtIFNJR05BTF9IRUlHSFQgLyAyLjBcbiAgICAgICAgICAgIHVubGVzcyBpc0xhc3RcbiAgICAgICAgICAgICAgICBwb2x5UG9pbnRzLnB1c2hcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6IEBfdGltZVRvUG9zKHZhbHVlT2JqZWN0LmVuZClcbiAgICAgICAgICAgICAgICAgICAgICAgIHk6IG9yaWdpbllcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBwb2x5UG9pbnRzLnB1c2hcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6IEBfdGltZVRvUG9zKHZhbHVlT2JqZWN0LmVuZCkgKyBTSUdOQUxfQlVTX1NMT1BFICsgMlxuICAgICAgICAgICAgICAgICAgICAgICAgeTogb3JpZ2luWSAtIFNJR05BTF9IRUlHSFQgLyAyLjBcbiAgICAgICAgICAgICAgICBwb2x5UG9pbnRzLnB1c2hcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6IEBfdGltZVRvUG9zKHZhbHVlT2JqZWN0LmVuZCkgKyBTSUdOQUxfQlVTX1NMT1BFICsgMlxuICAgICAgICAgICAgICAgICAgICAgICAgeTogb3JpZ2luWSArIFNJR05BTF9IRUlHSFQgLyAyLjBcblxuICAgICAgICAgICAgcG9seVBvaW50cy5wdXNoXG4gICAgICAgICAgICAgICAgICAgIHg6IEBfdGltZVRvUG9zKHZhbHVlT2JqZWN0LmVuZCkgLSBTSUdOQUxfQlVTX1NMT1BFXG4gICAgICAgICAgICAgICAgICAgIHk6IG9yaWdpblkgKyBTSUdOQUxfSEVJR0hUIC8gMi4wXG4gICAgICAgICAgICBwb2x5UG9pbnRzLnB1c2hcbiAgICAgICAgICAgICAgICAgICAgeDogQF90aW1lVG9Qb3ModmFsdWVPYmplY3Quc3RhcnQpICsgU0lHTkFMX0JVU19TTE9QRVxuICAgICAgICAgICAgICAgICAgICB5OiBvcmlnaW5ZICsgU0lHTkFMX0hFSUdIVCAvIDIuMFxuXG4gICAgICAgICAgICBsYXN0UG9pbnQgPSBbcG9seVBvaW50c1twb2x5UG9pbnRzLmxlbmd0aCAtIDFdLngsIHBvbHlQb2ludHNbcG9seVBvaW50cy5sZW5ndGggLSAxXS55XVxuXG4gICAgICAgICAgICBwb2x5V2lkdGggPSBAcG9pbnREaXN0IHBvbHlQb2ludHNbMl0ueCwgcG9seVBvaW50c1syXS55LCBwb2x5UG9pbnRzWzNdLngsIHBvbHlQb2ludHNbM10ueVxuXG4gICAgICAgICAgICBwb2x5TGluZSA9IG5ldyBmYWJyaWMuUG9seWxpbmUgcG9seVBvaW50cyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJva2U6IGlmIHZhbHVlIGlzICd4JyB0aGVuIERFRkFVTFRfQ09MT1IuU0lHTkFMX0RDIGVsc2UgaWYgdmFsdWUudG9Mb3dlckNhc2UoKSBpcyAneicgdGhlbiBERUZBVUxUX0NPTE9SLlNJR05BTF9JTVBFRCBlbHNlIHNpZ25hbENvbG9yXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsbDogdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0YWJsZTogbm9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNDb250cm9sczogbm9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNSb3RhdGluZ1BvaW50OiBub1xuICAgICAgICAgICAgQF9jYW52YXMuYWRkIHBvbHlMaW5lXG4gICAgICAgICAgICBjZW50cmVQb2ludCA9IHBvbHlMaW5lLmdldENlbnRlclBvaW50KClcblxuICAgICAgICAgICAgcG9seVRleHQgPSBuZXcgZmFicmljLlRleHQgQF9nZXRGb3JtYXR0ZWRWYWx1ZSh2YWx1ZSwgdmFsdWVPYmplY3Qud2lkdGgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9udDogJ0FyaWFsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9udFNpemU6IDExXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RhYmxlOiBub1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzQ29udHJvbHM6IG5vXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNSb3RhdGluZ1BvaW50OiBub1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsbDogREVGQVVMVF9DT0xPUi5TSUdOQUxfVkFMVUVcbiAgICAgICAgICAgIHBvbHlUZXh0LnNldCAnbGVmdCcsIGNlbnRyZVBvaW50LnggLSBwb2x5VGV4dC53aWR0aCAvIDIuMFxuICAgICAgICAgICAgcG9seVRleHQuc2V0ICd0b3AnLCBjZW50cmVQb2ludC55IC0gcG9seVRleHQuaGVpZ2h0IC8gMi4wXG5cbiAgICAgICAgICAgIHRleHRWYWx1ZSA9IHBvbHlUZXh0LnRleHRcbiAgICAgICAgICAgIHRleHRXaWR0aCA9IHBvbHlUZXh0LndpZHRoXG5cbiAgICAgICAgICAgIHdpZHRoT3ZlcmZsb3cgPSB0ZXh0V2lkdGggPiBwb2x5V2lkdGhcbiAgICAgICAgICAgIHdoaWxlIHRleHRXaWR0aCA+IHBvbHlXaWR0aFxuICAgICAgICAgICAgICAgIHRleHRWYWx1ZSA9IHRleHRWYWx1ZS5zdWJzdHIgMCwgdGV4dFZhbHVlLmxlbmd0aCAtIDFcbiAgICAgICAgICAgICAgICBwb2x5VGV4dC5zZXRUZXh0IHRleHRWYWx1ZVxuICAgICAgICAgICAgICAgIHBvbHlUZXh0LnNldExlZnQgcG9seVRleHQubGVmdCArIDFcbiAgICAgICAgICAgICAgICB0ZXh0V2lkdGggPSBwb2x5VGV4dC53aWR0aFxuICAgICAgICAgICAgaWYgd2lkdGhPdmVyZmxvd1xuICAgICAgICAgICAgICAgIHRleHRWYWx1ZSA9IHRleHRWYWx1ZSArICcuLidcbiAgICAgICAgICAgICAgICBwb2x5VGV4dC5zZXRUZXh0IHRleHRWYWx1ZVxuICAgICAgICAgICAgICAgIHBvbHlUZXh0LnNldExlZnQgcG9seVRleHQubGVmdCArIDFcblxuICAgICAgICAgICAgQF9zaWduYWxWYWx1ZVRleHQucHVzaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHRib3g6IHBvbHlUZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IHZhbHVlT2JqZWN0LndpZHRoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlXG4gICAgICAgICAgICBAX2NhbnZhcy5hZGQgcG9seVRleHRcbiAgICAgICAgICAgIHJldHVybiBbQF90aW1lVG9Qb3ModmFsdWVPYmplY3QuZW5kKSwgb3JpZ2luWSwgdmFsdWUsIHBvbHlMaW5lXVxuXG5cblxuXG4gICAgX2dldEdyaWRMaW5lOiAoY29vcmRzKSAtPlxuICAgICAgICBuZXcgZmFicmljLkxpbmUgY29vcmRzLFxuICAgICAgICAgICAgZmlsbDogREVGQVVMVF9DT0xPUi5HUklEX0xJTkVcbiAgICAgICAgICAgIHN0cm9rZTogREVGQVVMVF9DT0xPUi5HUklEX0xJTkVcbiAgICAgICAgICAgIHN0cm9rZVdpZHRoOiAxXG4gICAgICAgICAgICBvcGFjaXR5OiAwLjNcbiAgICAgICAgICAgIHNlbGVjdGFibGU6IG5vXG4gICAgICAgICAgICBoYXNDb250cm9sczogbm9cbiAgICAgICAgICAgIGhhc1JvdGF0aW5nUG9pbnQ6IG5vXG5cbiAgICBfZHJhd1NpZ25hbE5hbWVzOiAtPlxuICAgICAgICBzaWduYWxQb3MgPSBTSUdOQUxfQk9YX1BBRERJTkcgKyBSVUxFUl9IRUlHSFRcbiAgICAgICAgQF9zaWduYWxOYW1lcyA9IFtdXG4gICAgICAgIEBfc2lnbmFsQ3VycmVudFZhbHVlcyA9IFtdXG4gICAgICAgIGZvciByZW5kZXJlZCBpbiBAcmVuZGVyZWRTaWduYWxzXG4gICAgICAgICAgICBzaWduYWwgPSByZW5kZXJlZC5zaWduYWxcbiAgICAgICAgICAgIGJ1c1NpZ25hbCA9IEBpc0J1cyBzaWduYWwubmFtZVxuICAgICAgICAgICAgbmFtZWJveFRleHQgPSBuZXcgZmFicmljLklUZXh0IHNpZ25hbC5uYW1lLFxuICAgICAgICAgICAgICAgIGZvbnQ6ICdBcmlhbCdcbiAgICAgICAgICAgICAgICBsZWZ0OiAxMFxuICAgICAgICAgICAgICAgIHRvcDogIHNpZ25hbFBvcyArIDRcbiAgICAgICAgICAgICAgICBmb250U2l6ZTogMTJcbiAgICAgICAgICAgICAgICBzZWxlY3RhYmxlOiBub1xuICAgICAgICAgICAgICAgIGhhc0NvbnRyb2xzOiBub1xuICAgICAgICAgICAgICAgIGhhc1JvdGF0aW5nUG9pbnQ6IG5vXG4gICAgICAgICAgICAgICAgd2lkdGg6IFNJR05BTF9CT1hfV0lEVEhcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IFNJR05BTF9CT1hfSEVJR0hUXG4gICAgICAgICAgICAgICAgZmlsbDogREVGQVVMVF9DT0xPUi5TSUdOQUxfTkFNRVxuXG4gICAgICAgICAgICBzaWduYWxDdXJyZW50VmFsdWUgPSBuZXcgZmFicmljLklUZXh0ICcwJyxcbiAgICAgICAgICAgICAgICBmb250OiAnQXJpYWwnXG4gICAgICAgICAgICAgICAgbGVmdDogU0lHTkFMX0JPWF9XSURUSCArIDEyXG4gICAgICAgICAgICAgICAgdG9wOiAgc2lnbmFsUG9zICsgNFxuICAgICAgICAgICAgICAgIGZvbnRTaXplOiAxMVxuICAgICAgICAgICAgICAgIHNlbGVjdGFibGU6IG5vXG4gICAgICAgICAgICAgICAgaGFzQ29udHJvbHM6IG5vXG4gICAgICAgICAgICAgICAgaGFzUm90YXRpbmdQb2ludDogbm9cbiAgICAgICAgICAgICAgICB3aWR0aDogU0lHTkFMX0JPWF9XSURUSFxuICAgICAgICAgICAgICAgIGhlaWdodDogU0lHTkFMX0JPWF9IRUlHSFRcbiAgICAgICAgICAgICAgICBmaWxsOiBERUZBVUxUX0NPTE9SLlNJR05BTF9DVVJSRU5UX1ZBTFVFXG5cbiAgICAgICAgICAgIEBfc2lnbmFsTmFtZXMucHVzaCBuYW1lYm94VGV4dFxuXG4gICAgICAgICAgICByZW5kZXJlZC50ZXh0ID0gbmFtZWJveFRleHRcbiAgICAgICAgICAgIHJlbmRlcmVkLnlwb3MgPSBzaWduYWxQb3NcblxuICAgICAgICAgICAgQF9zaWduYWxDdXJyZW50VmFsdWVzLnB1c2ggc2lnbmFsQ3VycmVudFZhbHVlXG5cbiAgICAgICAgICAgIHNpZ25hbFBvcyArPSAoU0lHTkFMX0JPWF9IRUlHSFQgKyBTSUdOQUxfQk9YX1BBRERJTkcpXG5cbiAgICAgICAgQF9jdXJyZW50VmFsdWVMaW5lU3RhcnQgPSBuZXcgZmFicmljLkxpbmUgW1NJR05BTF9CT1hfV0lEVEggKyAxMCwgMCwgU0lHTkFMX0JPWF9XSURUSCArIDEwLCBAX2NhbnZhcy5oZWlnaHRdLFxuICAgICAgICAgICAgZmlsbDogREVGQVVMVF9DT0xPUi5DVVJSRU5UX1ZBTFVFX0xJTkVcbiAgICAgICAgICAgIHN0cm9rZTogREVGQVVMVF9DT0xPUi5DVVJSRU5UX1ZBTFVFX0xJTkVcbiAgICAgICAgICAgIHN0cm9rZVdpZHRoOiAxXG4gICAgICAgICAgICBvcGFjaXR5OiAxXG4gICAgICAgICAgICBzZWxlY3RhYmxlOiBub1xuICAgICAgICAgICAgaGFzQ29udHJvbHM6IG5vXG4gICAgICAgICAgICBoYXNSb3RhdGluZ1BvaW50OiBub1xuICAgICAgICBAX2N1cnJlbnRWYWx1ZUxpbmVFbmQgPSBuZXcgZmFicmljLkxpbmUgW1NJR05BTF9OQU1FU19CT1hfV0lEVEgsIDAsIFNJR05BTF9OQU1FU19CT1hfV0lEVEgsIEBfY2FudmFzLmhlaWdodF0sXG4gICAgICAgICAgICBmaWxsOiBERUZBVUxUX0NPTE9SLkNVUlJFTlRfVkFMVUVfTElORVxuICAgICAgICAgICAgc3Ryb2tlOiBERUZBVUxUX0NPTE9SLkNVUlJFTlRfVkFMVUVfTElORVxuICAgICAgICAgICAgc3Ryb2tlV2lkdGg6IDFcbiAgICAgICAgICAgIG9wYWNpdHk6IDFcbiAgICAgICAgICAgIHNlbGVjdGFibGU6IG5vXG4gICAgICAgICAgICBoYXNDb250cm9sczogbm9cbiAgICAgICAgICAgIGhhc1JvdGF0aW5nUG9pbnQ6IG5vXG5cbiAgICAgICAgQF9jYW52YXMuYWRkIEBfY3VycmVudFZhbHVlTGluZVN0YXJ0XG4gICAgICAgIEBfY2FudmFzLmFkZCBAX2N1cnJlbnRWYWx1ZUxpbmVFbmRcblxuICAgICAgICBmb3IgdGV4dGFyZWEgaW4gQF9zaWduYWxOYW1lc1xuICAgICAgICAgICAgQF9jYW52YXMuYWRkIHRleHRhcmVhXG4gICAgICAgICAgICBpZiB0ZXh0YXJlYS53aWR0aCA+IFNJR05BTF9CT1hfV0lEVEhcbiAgICAgICAgICAgICAgICB0ZXh0YXJlYS5zY2FsZVRvV2lkdGggU0lHTkFMX0JPWF9XSURUSCAtIDEwXG5cblxuXG5cbiAgICBfZ2V0U2lnbmFsVmFsdWVzOiAod2F2ZSwgc3RhcnQgPSBAcmVuZGVyRnJvbSwgZW5kID0gQHJlbmRlclRvKSAtPlxuICAgICAgICByZXR1cm4gW10gaWYgd2F2ZS5sZW5ndGggaXMgMFxuICAgICAgICB2YWx1ZXMgPSBbXVxuXG4gICAgICAgIHZhbHVlQWRkZWQgPSBub1xuICAgICAgICB3YXZlSW5kZXggPSAwXG5cbiAgICAgICAgX2JldHdlZW4gPSAodmFsLCBzdGFydFJhbmdlID0gc3RhcnQsIGVuZFJhbmdlID0gZW5kKSAtPlxuICAgICAgICAgICAgKHZhbCA+PSBzdGFydFJhbmdlKSBhbmQgKHZhbCA8PSBlbmRSYW5nZSlcblxuICAgICAgICB3aGlsZSB3YXZlSW5kZXggPCB3YXZlLmxlbmd0aFxuICAgICAgICAgICAgd2F2ZVZhbHVlID0gd2F2ZVt3YXZlSW5kZXhdXG4gICAgICAgICAgICB2YWx1ZVN0YXJ0ID0gTnVtYmVyLnBhcnNlSW50IHdhdmVWYWx1ZVswXVxuICAgICAgICAgICAgdmFsdWVFbmQgPSBpZiB3YXZlSW5kZXggaXMgd2F2ZS5sZW5ndGggLSAxIHRoZW4gZW5kIGVsc2UgTnVtYmVyLnBhcnNlSW50IHdhdmVbd2F2ZUluZGV4ICsgMV1bMF1cbiAgICAgICAgICAgIG5ld1ZhbHVlID1cbiAgICAgICAgICAgICAgICBzdGFydDogMFxuICAgICAgICAgICAgICAgIGVuZDogMFxuICAgICAgICAgICAgICAgIHZhbHVlOiB3YXZlVmFsdWVbMV1cblxuICAgICAgICAgICAgaWYgX2JldHdlZW4odmFsdWVTdGFydCkgYW5kIF9iZXR3ZWVuKHZhbHVlRW5kKVxuICAgICAgICAgICAgICAgIG5ld1ZhbHVlLnN0YXJ0ID0gdmFsdWVTdGFydFxuICAgICAgICAgICAgICAgIG5ld1ZhbHVlLmVuZCA9IHZhbHVlRW5kXG4gICAgICAgICAgICBlbHNlIGlmIF9iZXR3ZWVuKHZhbHVlU3RhcnQpIGFuZCB2YWx1ZUVuZCA+IGVuZFxuICAgICAgICAgICAgICAgIG5ld1ZhbHVlLnN0YXJ0ID0gdmFsdWVTdGFydFxuICAgICAgICAgICAgICAgIG5ld1ZhbHVlLmVuZCA9IGVuZFxuICAgICAgICAgICAgZWxzZSBpZiBfYmV0d2Vlbih2YWx1ZUVuZCkgYW5kIHZhbHVlU3RhcnQgPCBzdGFydFxuICAgICAgICAgICAgICAgIG5ld1ZhbHVlLnN0YXJ0ID0gc3RhcnRcbiAgICAgICAgICAgICAgICBuZXdWYWx1ZS5lbmQgPSB2YWx1ZUVuZFxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHdhdmVJbmRleCsrXG4gICAgICAgICAgICAgICAgY29udGludWVcblxuICAgICAgICAgICAgdmFsdWVzLnB1c2ggbmV3VmFsdWVcbiAgICAgICAgICAgIHZhbHVlQWRkZWQgPSB5ZXNcbiAgICAgICAgICAgIHdhdmVJbmRleCsrXG5cbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzdGFydDogc3RhcnRcbiAgICAgICAgICAgICAgICBlbmQ6IGVuZFxuICAgICAgICAgICAgICAgIHZhbHVlOiB3YXZlW3dhdmUubGVuZ3RoIC0gMV1bMV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXSB1bmxlc3MgdmFsdWVBZGRlZFxuXG4gICAgICAgIHZhbHVlc1xuXG5cbiAgICBfdGltZVRvUG9zOiAodGltZSwgZnJvbSA9IEByZW5kZXJGcm9tLCByb3VuZCA9IHllcykgLT5cbiAgICAgICAgaWYgcm91bmRcbiAgICAgICAgICAgICNNYXRoLnJvdW5kKFNJR05BTF9OQU1FU19CT1hfV0lEVEggKyB0aW1lICogQF9yZW5kZXJEaXN0YW5jZUZhY3RvciAtIE1hdGguZmxvb3IoZnJvbSAqIEBfcmVuZGVyRGlzdGFuY2VGYWN0b3IpKVxuICAgICAgICAgICAgTWF0aC5yb3VuZChTSUdOQUxfTkFNRVNfQk9YX1dJRFRIICsgdGltZSAqIEBfcmVuZGVyRGlzdGFuY2VGYWN0b3IgLSBNYXRoLnJvdW5kKGZyb20gKiBAX3JlbmRlckRpc3RhbmNlRmFjdG9yKSlcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgU0lHTkFMX05BTUVTX0JPWF9XSURUSCArIHRpbWUgKiBAX3JlbmRlckRpc3RhbmNlRmFjdG9yIC0gZnJvbSAqIEBfcmVuZGVyRGlzdGFuY2VGYWN0b3JcblxuICAgIF9wb3NUb1RpbWU6IChwb3MsIGZyb20gPSBAcmVuZGVyRnJvbSwgcm91bmQgPSB5ZXMpIC0+XG4gICAgICAgIGlmIHJvdW5kXG4gICAgICAgICAgICBNYXRoLnJvdW5kKChwb3MgLSBTSUdOQUxfTkFNRVNfQk9YX1dJRFRIKSAvIEBfcmVuZGVyRGlzdGFuY2VGYWN0b3IpICsgTWF0aC5yb3VuZCBmcm9tXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIChwb3MgLSBTSUdOQUxfTkFNRVNfQk9YX1dJRFRIKSAvIEBfcmVuZGVyRGlzdGFuY2VGYWN0b3IgKyBmcm9tXG5cblxuICAgIF9nZXRGb3JtYXR0ZWRWYWx1ZTogKHZhbHVlLCBsZW5ndGggPSA4KSAtPlxuICAgICAgICBpZiBAcmFkaXggaXMgUkFESVhfREVDXG4gICAgICAgICAgICBpZiB2YWx1ZSBpcyAneCdcbiAgICAgICAgICAgICAgICBcIiN7QHBhZCh2YWx1ZSwgbGVuZ3RoLCAneCcpfVwiXG4gICAgICAgICAgICBlbHNlIGlmIHZhbHVlLnRvTG93ZXJDYXNlKCkgaXMgJ3onXG4gICAgICAgICAgICAgICAgXCIje0BwYWQodmFsdWUsIGxlbmd0aCwgJ3onKX1cIlxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIFwiI3tAYmluVG9EZWModmFsdWUpfVwiXG4gICAgICAgIGVsc2UgaWYgQHJhZGl4IGlzIFJBRElYX0hFWFxuICAgICAgICAgICAgaWYgdmFsdWUgaXMgJ3gnXG4gICAgICAgICAgICAgICAgXCIje0BwYWQodmFsdWUsIGxlbmd0aCwgJ3gnKX1cIlxuICAgICAgICAgICAgZWxzZSBpZiB2YWx1ZS50b0xvd2VyQ2FzZSgpIGlzICd6J1xuICAgICAgICAgICAgICAgIFwiI3tAcGFkKHZhbHVlLCBsZW5ndGgsICd6Jyl9XCJcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBcIjB4I3tAYmluVG9IZXgodmFsdWUpfVwiXG4gICAgICAgIGVsc2UgaWYgQHJhZGl4IGlzIFJBRElYX0JJTlxuICAgICAgICAgICAgaWYgdmFsdWUgaXMgJ3gnXG4gICAgICAgICAgICAgICAgXCIje0BwYWQodmFsdWUsIGxlbmd0aCwgJ3gnKX1cIlxuICAgICAgICAgICAgZWxzZSBpZiB2YWx1ZS50b0xvd2VyQ2FzZSgpIGlzICd6J1xuICAgICAgICAgICAgICAgIFwiI3tAcGFkKHZhbHVlLCBsZW5ndGgsICd6Jyl9XCJcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBcIiN7QHBhZCh2YWx1ZSwgbGVuZ3RoKX1cIlxuXG5cbiAgICBfaW5pdExheW91dDogLT5cbiAgICAgICAgQF9hZGRTaWduYWxCdXR0b25JZCA9IFwiI3tAX2NvbnRhaW5lcklkfS13YXZlZm9ybS1hZGQtYnRuXCJcbiAgICAgICAgQF9hZGRTaWduYWxCdXR0b24gPSAkKFwiPGJ1dHRvbiBjbGFzcz1cXFwid2F2ZWZvcm0tdG9vbGJhci1idG5cXFwiIGlkPVxcXCIje0BfYWRkU2lnbmFsQnV0dG9uSWR9XFxcIj5BZGQgU2dpbmFsPC9idXR0b24+XCIpXG4gICAgICAgIEBfcmVtb3ZlU2lnbmFsQnV0dG9uSWQgPSBcIiN7QF9jb250YWluZXJJZH0td2F2ZWZvcm0tcmVtb3ZlLWJ0blwiXG4gICAgICAgIEBfcmVtb3ZlU2lnbmFsQnV0dG9uID0gJChcIjxidXR0b24gY2xhc3M9XFxcIndhdmVmb3JtLXRvb2xiYXItYnRuXFxcIiBpZD1cXFwiI3tAX3JlbW92ZVNpZ25hbEJ1dHRvbklkfVxcXCI+UmVtb3ZlIFNnaW5hbDwvYnV0dG9uPlwiKVxuICAgICAgICBAX3pvb21JbkJ1dHRvbklkID0gXCIje0BfY29udGFpbmVySWR9LXdhdmVmb3JtLXpvb21pbi1idG5cIlxuICAgICAgICBAX3pvb21JbkJ1dHRvbiA9ICQoXCI8YnV0dG9uIGNsYXNzPVxcXCJ3YXZlZm9ybS10b29sYmFyLWJ0blxcXCIgaWQ9XFxcIiN7QF96b29tSW5CdXR0b25JZH1cXFwiPlpvb20gSW48L2J1dHRvbj5cIilcbiAgICAgICAgQF96b29tT3V0QnV0dG9uSWQgPSBcIiN7QF9jb250YWluZXJJZH0td2F2ZWZvcm0tem9vbW91dC1idG5cIlxuICAgICAgICBAX3pvb21PdXRCdXR0b24gPSAkKFwiPGJ1dHRvbiBjbGFzcz1cXFwid2F2ZWZvcm0tdG9vbGJhci1idG5cXFwiIGlkPVxcXCIje0Bfem9vbU91dEJ1dHRvbklkfVxcXCI+Wm9vbSBPdXQ8L2J1dHRvbj5cIilcbiAgICAgICAgQF96b29tQWxsQnV0dG9uSWQgPSBcIiN7QF9jb250YWluZXJJZH0td2F2ZWZvcm0tem9vbWFsbC1idG5cIlxuICAgICAgICBAX3pvb21BbGxCdXR0b24gPSAkKFwiPGJ1dHRvbiBjbGFzcz1cXFwid2F2ZWZvcm0tdG9vbGJhci1idG5cXFwiIGlkPVxcXCIje0Bfem9vbUFsbEJ1dHRvbklkfVxcXCI+Wm9vbSBBbGw8L2J1dHRvbj5cIilcbiAgICAgICAgQF9nb3RvRmlyc3RCdXR0b25JZCA9IFwiI3tAX2NvbnRhaW5lcklkfS13YXZlZm9ybS1nb3RvZmlyc3QtYnRuXCJcbiAgICAgICAgQF9nb3RvRmlyc3RCdXR0b24gPSAkKFwiPGJ1dHRvbiBjbGFzcz1cXFwid2F2ZWZvcm0tdG9vbGJhci1idG5cXFwiIGlkPVxcXCIje0BfZ290b0ZpcnN0QnV0dG9uSWR9XFxcIj5Hb3RvIEZpcnN0PC9idXR0b24+XCIpXG4gICAgICAgIEBfZ29MZWZ0QnV0dG9uSWQgPSBcIiN7QF9jb250YWluZXJJZH0td2F2ZWZvcm0tZ29sZWZ0LWJ0blwiXG4gICAgICAgIEBfZ29MZWZ0QnV0dG9uID0gJChcIjxidXR0b24gY2xhc3M9XFxcIndhdmVmb3JtLXRvb2xiYXItYnRuXFxcIiBpZD1cXFwiI3tAX2dvTGVmdEJ1dHRvbklkfVxcXCI+R28gTGVmdDwvYnV0dG9uPlwiKVxuICAgICAgICBAX2dvUmlnaHRCdXR0b25JZCA9IFwiI3tAX2NvbnRhaW5lcklkfS13YXZlZm9ybS1nb3JpZ2h0LWJ0blwiXG4gICAgICAgIEBfZ29SaWdodEJ1dHRvbiA9ICQoXCI8YnV0dG9uIGNsYXNzPVxcXCJ3YXZlZm9ybS10b29sYmFyLWJ0blxcXCIgaWQ9XFxcIiN7QF9nb1JpZ2h0QnV0dG9uSWR9XFxcIj5HbyBSaWdodDwvYnV0dG9uPlwiKVxuICAgICAgICBAX3Jlc2V0QnV0dG9uSWQgPSBcIiN7QF9jb250YWluZXJJZH0td2F2ZWZvcm0tcmVzZXQtYnRuXCJcbiAgICAgICAgQF9yZXNldEJ1dHRvbiA9ICQoXCI8YnV0dG9uIGNsYXNzPVxcXCJ3YXZlZm9ybS10b29sYmFyLWJ0blxcXCIgaWQ9XFxcIiN7QF9nb1JpZ2h0QnV0dG9uSWR9XFxcIj5SZXNldCBUaW1pbmcgRGlhZ3JhbTwvYnV0dG9uPlwiKVxuICAgICAgICBAX3JhZGl4U2VsZWN0QmluSWQgPSBcIiN7QF9jb250YWluZXJJZH0td2F2ZWZvcm0tcmFkaXgtYmluXCJcbiAgICAgICAgQF9vcHRpb25CaW4gPSAkKFwiPG9wdGlvbiBjbGFzcz1cXFwid2F2ZWZvcm0tdG9vbGJhci1vcHRpb25cXFwiIGlkPVxcXCIje0BfcmFkaXhTZWxlY3RCaW5JZH1cXFwiIHZhbHVlPVxcXCIje0BfcmFkaXhTZWxlY3RCaW5JZH1cXFwiIHNlbGVjdGVkPkJpbmFyeTwvb3B0aW9uPlwiKVxuICAgICAgICBAX3JhZGl4U2VsZWN0RGVjSWQgPSBcIiN7QF9jb250YWluZXJJZH0td2F2ZWZvcm0tcmFkaXgtZGVjXCJcbiAgICAgICAgQF9vcHRpb25EZWMgPSAkKFwiPG9wdGlvbiBjbGFzcz1cXFwid2F2ZWZvcm0tdG9vbGJhci1vcHRpb25cXFwiIGlkPVxcXCIje0BfcmFkaXhTZWxlY3REZWNJZH1cXFwiIHZhbHVlPVxcXCIje0BfcmFkaXhTZWxlY3REZWNJZH1cXFwiPkRlY2ltYWw8L29wdGlvbj5cIilcbiAgICAgICAgQF9yYWRpeFNlbGVjdEhleElkID0gXCIje0BfY29udGFpbmVySWR9LXdhdmVmb3JtLXJhZGl4LWhleFwiXG4gICAgICAgIEBfb3B0aW9uSGV4ID0gJChcIjxvcHRpb24gY2xhc3M9XFxcIndhdmVmb3JtLXRvb2xiYXItb3B0aW9uXFxcIiBpZD1cXFwiI3tAX3JhZGl4U2VsZWN0SGV4SWR9XFxcIiB2YWx1ZT1cXFwiI3tAX3JhZGl4U2VsZWN0SGV4SWR9XFxcIj5IZXhhZGVjaW1hbDwvb3B0aW9uPlwiKVxuICAgICAgICBAX3JhZGl4U2VsZWN0SWQgPSBcIiN7QF9jb250YWluZXJJZH0td2F2ZWZvcm0tcmFkaXgtc2VsZWN0XCJcbiAgICAgICAgQF9yYWRpeFNlbGVjdExhYmVsSWQgPSBcIiN7QF9jb250YWluZXJJZH0td2F2ZWZvcm0tcmFkaXgtc2VsZWN0LWxhYmVsXCJcbiAgICAgICAgQF9yYWRpeFNlbGVjdExhYmVsID0gJChcIjxsYWJlbCBjbGFzcz1cXFwid2F2ZWZvcm0tdG9vbGJhci1sYWJlbFxcXCIgaWQ9XFxcIiN7QF9yYWRpeFNlbGVjdExhYmVsSWR9XFxcIiBmb3I9XFxcIiN7QF9yYWRpeFNlbGVjdElkfVxcXCI+U2VsZWN0IGEgc3BlZWQ8L2xhYmVsPlwiKVxuICAgICAgICBAX3JhZGl4U2VsZWN0ID0gJChcIjxzZWxlY3QgY2xhc3M9XFxcIndhdmVmb3JtLXRvb2xiYXItc2VsZWN0XFxcIiBuYW1lPVxcXCJyYWRpeC1zZWxlY3RcXFwiIGlkPVxcXCIje0BfcmFkaXhTZWxlY3RJZH1cXFwiPjwvc2VsZWN0PlwiKVxuXG4gICAgICAgIEBfY3Vyc29yVmFsdWVJZCA9IFwiI3tAX2NvbnRhaW5lcklkfS13YXZlZm9ybS10b29sYmFyLWN1cnNvci12YWx1ZVwiXG4gICAgICAgIEBfY3Vyc29yVmFsdWVEaXYgPSAkKFwiPGRpdiBpZD1cXFwiI3tAX2N1cnNvclZhbHVlSWR9XFxcIiBjbGFzcz1cXFwiY3Vyc29yLXRvb2xiYXItdmFsdWVcXFwiPkN1cnNvcjogMG5zPC9kaXY+XCIpXG5cbiAgICAgICAgQF9tb2RhbERpYWxvZ0lkID0gXCIje0BfY29udGFpbmVySWR9LXdhdmVmb3JtLW1vZGFsXCJcbiAgICAgICAgQF9tb2RhbERpYWxvZyA9ICQoXCI8ZGl2IGlkPVxcXCIje0BfbW9kYWxEaWFsb2dJZH1cXFwiPjwvZGl2PlwiKVxuXG4gICAgICAgIEBfdG9vbGJhcmRJZCA9IFwiI3tAX2NvbnRhaW5lcklkfS13YXZlZm9ybS10b29sYmFyXCJcbiAgICAgICAgQF93YXZlZm9ybVRvb2xiYXIgPSAkKFwiPGRpdiBpZD1cXFwiI3tAX3Rvb2xiYXJkSWR9XFxcIiBjbGFzcz1cXFwidWktd2lkZ2V0LWhlYWRlciB1aS1jb3JuZXItYWxsIHdhdmVmb3JtLXRvb2xiYXJcXFwiPjwvZGl2PlwiKVxuXG4gICAgICAgIEBfd2F2ZWZvcm1Ub29sYmFyLmFwcGVuZCBAX2FkZFNpZ25hbEJ1dHRvblxuICAgICAgICBAX3dhdmVmb3JtVG9vbGJhci5hcHBlbmQgQF9yZW1vdmVTaWduYWxCdXR0b25cbiAgICAgICAgQF93YXZlZm9ybVRvb2xiYXIuYXBwZW5kIEBfem9vbUluQnV0dG9uXG4gICAgICAgIEBfd2F2ZWZvcm1Ub29sYmFyLmFwcGVuZCBAX3pvb21PdXRCdXR0b25cbiAgICAgICAgQF93YXZlZm9ybVRvb2xiYXIuYXBwZW5kIEBfem9vbUFsbEJ1dHRvblxuICAgICAgICBAX3dhdmVmb3JtVG9vbGJhci5hcHBlbmQgQF9nb3RvRmlyc3RCdXR0b25cbiAgICAgICAgQF93YXZlZm9ybVRvb2xiYXIuYXBwZW5kIEBfZ29MZWZ0QnV0dG9uXG4gICAgICAgIEBfd2F2ZWZvcm1Ub29sYmFyLmFwcGVuZCBAX2dvUmlnaHRCdXR0b25cbiAgICAgICAgQF93YXZlZm9ybVRvb2xiYXIuYXBwZW5kIEBfcmVzZXRCdXR0b25cblxuICAgICAgICBAX3JhZGl4U2VsZWN0LmFwcGVuZCBAX29wdGlvbkJpblxuICAgICAgICBAX3JhZGl4U2VsZWN0LmFwcGVuZCBAX29wdGlvbkRlY1xuICAgICAgICBAX3JhZGl4U2VsZWN0LmFwcGVuZCBAX29wdGlvbkhleFxuXG4gICAgICAgIEBfd2F2ZWZvcm1Ub29sYmFyLmFwcGVuZCBAX3JhZGl4U2VsZWN0XG4gICAgICAgIEBfd2F2ZWZvcm1Ub29sYmFyLmFwcGVuZCBAX2N1cnNvclZhbHVlRGl2XG4gICAgICAgIEBfY3Vyc29yVmFsdWVEaXYuaGlkZSgpXG5cbiAgICAgICAgQF9jb250YWluZXIuYXBwZW5kIEBfd2F2ZWZvcm1Ub29sYmFyXG4gICAgICAgIEBfY29udGFpbmVyLmFwcGVuZCBAX21vZGFsRGlhbG9nXG5cbiAgICAgICAgQF9jYW52YXNJZCA9IFwiI3tAX2NvbnRhaW5lcklkfS13YXZlZm9ybS1jYW52YXNcIlxuICAgICAgICBAX2NhbnZhc1dyYXBwZXIgPSAkKFwiPGNhbnZhcyBjbGFzcz1cXFwid2F2ZWZvcm0tY2FudmFzXFxcIiBpZD1cXFwiI3tAX2NhbnZhc0lkfVxcXCI+PC9jYW52YXM+XCIpXG5cblxuXG4gICAgICAgIEBfY2FudmFzVmlld3BvcnRJZCA9IFwiI3tAX2NvbnRhaW5lcklkfS13YXZlZm9ybS1jYW52YXMtdmlld3BvcnRcIlxuICAgICAgICBAX2NhbnZhc1ZpZXdwb3J0ID0gJChcIjxkaXYgY2xhc3M9XFxcImNhbnZhcy12aWV3cG9ydFxcXCIgaWQ9XFxcIiN7QF9jYW52YXNWaWV3cG9ydElkfVxcXCI+PC9kaXY+XCIpXG5cblxuXG4gICAgICAgIEBfY2FudmFzVmlld3BvcnQuYXBwZW5kIEBfY2FudmFzV3JhcHBlclxuXG4gICAgICAgIEBfY29udGFpbmVyLmFwcGVuZCBAX2NhbnZhc1ZpZXdwb3J0XG4gICAgICAgIEBjYW52YXNIZWlnaHQgPSBDQU5WQVNfTUFYX0hFSUdIVFxuICAgICAgICBAY2FudmFzV2lkdGggPSBAX2NvbnRhaW5lci53aWR0aCgpXG4gICAgICAgIEB2aWV3cG9ydEhlaWdodCA9IEBfY29udGFpbmVyLmhlaWdodCgpXG4gICAgICAgIEBjYW52YXNIZWlnaHQgPSBDQU5WQVNfTUFYX0hFSUdIVFxuXG5cbiAgICAgICAgQF9jYW52YXNWaWV3cG9ydC5hdHRyICd0YWJJbmRleCcsIDEwMDBcblxuICAgICAgICAkKFwiIyN7QF9jYW52YXNWaWV3cG9ydElkfVwiKS5rZXlkb3duIChlKT0+XG4gICAgICAgICAgICBpZiBlLmtleUNvZGUgaXMgMzhcbiAgICAgICAgICAgICAgICBpZiBAaGlnaGxpZ2h0ZWRcbiAgICAgICAgICAgICAgICAgICAgQGhpZ2hsaWdodGVkLmZpbGwgPSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgQGhpZ2hsaWdodGVkLm9wYWNpdHkgPSAwXG4gICAgICAgICAgICAgICAgQGhpZ2hsaWdodGVkSW5kZXgtLVxuICAgICAgICAgICAgICAgIEBoaWdobGlnaHRlZEluZGV4ID0gQHJlbmRlcmVkU2lnbmFscy5sZW5ndGggLSAxIGlmIEBoaWdobGlnaHRlZEluZGV4IDwgMFxuICAgICAgICAgICAgICAgIEBoaWdobGlnaHRlZCA9IEByZW5kZXJlZFNpZ25hbHNbQGhpZ2hsaWdodGVkSW5kZXhdLmhpZ2hsaWdodFxuICAgICAgICAgICAgICAgIEBoaWdobGlnaHRlZC5maWxsID0gREVGQVVMVF9DT0xPUi5TSUdOQUxfSElHSExJR0hUXG4gICAgICAgICAgICAgICAgQGhpZ2hsaWdodGVkLm9wYWNpdHkgPSBERUZBVUxUX09QQUNJVFkuU0lHTkFMX0hJR0hMSUdIVFxuICAgICAgICAgICAgICAgIEBfY2FudmFzLnJlbmRlckFsbCgpXG4gICAgICAgICAgICAgICAgQHNldEN1cnNvclRpbWUgQGN1cnJlbnRFeGFjdFRpbWVcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgIGVsc2UgaWYgZS5rZXlDb2RlIGlzIDQwXG4gICAgICAgICAgICAgICAgaWYgQGhpZ2hsaWdodGVkXG4gICAgICAgICAgICAgICAgICAgIEBoaWdobGlnaHRlZC5maWxsID0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICAgIEBoaWdobGlnaHRlZC5vcGFjaXR5ID0gMFxuICAgICAgICAgICAgICAgIEBoaWdobGlnaHRlZEluZGV4KytcbiAgICAgICAgICAgICAgICBAaGlnaGxpZ2h0ZWRJbmRleCA9IDAgaWYgQGhpZ2hsaWdodGVkSW5kZXggPj0gQHJlbmRlcmVkU2lnbmFscy5sZW5ndGhcbiAgICAgICAgICAgICAgICBAaGlnaGxpZ2h0ZWQgPSBAcmVuZGVyZWRTaWduYWxzW0BoaWdobGlnaHRlZEluZGV4XS5oaWdobGlnaHRcbiAgICAgICAgICAgICAgICBAaGlnaGxpZ2h0ZWQuZmlsbCA9IERFRkFVTFRfQ09MT1IuU0lHTkFMX0hJR0hMSUdIVFxuICAgICAgICAgICAgICAgIEBoaWdobGlnaHRlZC5vcGFjaXR5ID0gREVGQVVMVF9PUEFDSVRZLlNJR05BTF9ISUdITElHSFRcbiAgICAgICAgICAgICAgICBAX2NhbnZhcy5yZW5kZXJBbGwoKVxuICAgICAgICAgICAgICAgIEBzZXRDdXJzb3JUaW1lIEBjdXJyZW50RXhhY3RUaW1lXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICBlbHNlIGlmIGUuY3RybEtleSBhbmQgZS5rZXlDb2RlIGlzIDgzXG4gICAgICAgICAgICAgICAgaWYgQF9vblNhdmVMaXN0ZW5lclxuICAgICAgICAgICAgICAgICAgICBAX29uU2F2ZUxpc3RlbmVyIEBleHBvcnRUaW1pbmdEaWFncmFtKClcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcblxuXG4gICAgICAgIEBfYWRkU2lnbmFsQnV0dG9uLmJ1dHRvblxuICAgICAgICAgICAgdGV4dDogbm9cbiAgICAgICAgICAgIGljb25zOlxuICAgICAgICAgICAgICAgIHByaW1hcnk6ICd1aS1pY29uLXBsdXMnXG4gICAgICAgIEBfYWRkU2lnbmFsQnV0dG9uLmNsaWNrIChlKSA9PlxuICAgICAgICAgICAgQGFkZFNpZ25hbCgpXG5cbiAgICAgICAgQF9yZW1vdmVTaWduYWxCdXR0b24uYnV0dG9uXG4gICAgICAgICAgICB0ZXh0OiBub1xuICAgICAgICAgICAgaWNvbnM6XG4gICAgICAgICAgICAgICAgcHJpbWFyeTogJ3VpLWljb24tbWludXMnXG4gICAgICAgIEBfcmVtb3ZlU2lnbmFsQnV0dG9uLmNsaWNrIChlKSA9PlxuICAgICAgICAgICAgQHJlbW92ZVNpZ25hbCgpXG5cbiAgICAgICAgQF96b29tSW5CdXR0b24uYnV0dG9uXG4gICAgICAgICAgICB0ZXh0OiBub1xuICAgICAgICAgICAgaWNvbnM6XG4gICAgICAgICAgICAgICAgcHJpbWFyeTogJ3VpLWljb24tem9vbWluJ1xuICAgICAgICBAX3pvb21JbkJ1dHRvbi5jbGljayAoZSkgPT5cbiAgICAgICAgICAgIEB6b29tSW4oKVxuXG4gICAgICAgIEBfem9vbU91dEJ1dHRvbi5idXR0b25cbiAgICAgICAgICAgIHRleHQ6IG5vXG4gICAgICAgICAgICBpY29uczpcbiAgICAgICAgICAgICAgICBwcmltYXJ5OiAndWktaWNvbi16b29tb3V0J1xuICAgICAgICBAX3pvb21PdXRCdXR0b24uY2xpY2sgKGUpID0+XG4gICAgICAgICAgICBAem9vbU91dCgpXG5cbiAgICAgICAgQF96b29tQWxsQnV0dG9uLmJ1dHRvblxuICAgICAgICAgICAgdGV4dDogbm9cbiAgICAgICAgICAgIGljb25zOlxuICAgICAgICAgICAgICAgIHByaW1hcnk6ICd1aS1pY29uLWFycm93LTQtZGlhZydcbiAgICAgICAgQF96b29tQWxsQnV0dG9uLmNsaWNrIChlKSA9PlxuICAgICAgICAgICAgQHpvb21BbGwoKVxuXG4gICAgICAgIEBfZ290b0ZpcnN0QnV0dG9uLmJ1dHRvblxuICAgICAgICAgICAgdGV4dDogbm9cbiAgICAgICAgICAgIGljb25zOlxuICAgICAgICAgICAgICAgIHByaW1hcnk6ICd1aS1pY29uLWFycm93c3RvcC0xLXcnXG4gICAgICAgIEBfZ290b0ZpcnN0QnV0dG9uLmNsaWNrIChlKSA9PlxuICAgICAgICAgICAgQG1vdmVGaXJzdCgpXG5cbiAgICAgICAgQF9nb0xlZnRCdXR0b24uYnV0dG9uXG4gICAgICAgICAgICB0ZXh0OiBub1xuICAgICAgICAgICAgaWNvbnM6XG4gICAgICAgICAgICAgICAgcHJpbWFyeTogJ3VpLWljb24tdHJpYW5nbGUtMS13J1xuICAgICAgICBAX2dvTGVmdEJ1dHRvbi5jbGljayAoZSkgPT5cbiAgICAgICAgICAgIEBtb3ZlTGVmdCgpXG5cbiAgICAgICAgQF9nb1JpZ2h0QnV0dG9uLmJ1dHRvblxuICAgICAgICAgICAgdGV4dDogbm9cbiAgICAgICAgICAgIGljb25zOlxuICAgICAgICAgICAgICAgIHByaW1hcnk6ICd1aS1pY29uLXRyaWFuZ2xlLTEtZSdcbiAgICAgICAgQF9nb1JpZ2h0QnV0dG9uLmNsaWNrIChlKSA9PlxuICAgICAgICAgICAgQG1vdmVSaWdodCgpXG5cbiAgICAgICAgQF9yZXNldEJ1dHRvbi5idXR0b25cbiAgICAgICAgICAgIHRleHQ6IG5vXG4gICAgICAgICAgICBpY29uczpcbiAgICAgICAgICAgICAgICBwcmltYXJ5OiAndWktaWNvbi1hcnJvd3JlZnJlc2gtMS1uJ1xuICAgICAgICBAX3Jlc2V0QnV0dG9uLmNsaWNrIChlKSA9PlxuICAgICAgICAgICAgQHJlc2V0VGltaW5nRGlhZ3JhbSgpXG5cbiAgICAgICAgQF9yYWRpeFNlbGVjdC5zZWxlY3RtZW51KClcblxuICAgICAgICAkKFwiIyN7QF9jb250YWluZXJJZH0td2F2ZWZvcm0tcmFkaXgtc2VsZWN0LWJ1dHRvblwiKS5jc3MoJ2Rpc3BsYXknLCAnaW5saW5lLXRhYmxlJylcbiAgICAgICAgJChcIiMje0BfY29udGFpbmVySWR9LXdhdmVmb3JtLXJhZGl4LXNlbGVjdC1idXR0b25cIikuZmluZCgnLnVpLXNlbGVjdG1lbnUtdGV4dCcpLmNzcygnbGluZS1oZWlnaHQnLCAnMC42JylcblxuICAgICAgICBAX3JhZGl4U2VsZWN0Lm9uIFwic2VsZWN0bWVudWNoYW5nZVwiLCAodWksIGUpID0+XG4gICAgICAgICAgICBzZWxlY3RlZFJhZGl4SWQgPSBlLml0ZW0udmFsdWVcbiAgICAgICAgICAgIGlmIHNlbGVjdGVkUmFkaXhJZCBpcyBAX3JhZGl4U2VsZWN0QmluSWRcbiAgICAgICAgICAgICAgICBAc2V0UmFkaXggUkFESVhfQklOXG4gICAgICAgICAgICBlbHNlIGlmIHNlbGVjdGVkUmFkaXhJZCBpcyBAX3JhZGl4U2VsZWN0RGVjSWRcbiAgICAgICAgICAgICAgICBAc2V0UmFkaXggUkFESVhfREVDXG4gICAgICAgICAgICBlbHNlIGlmIHNlbGVjdGVkUmFkaXhJZCBpcyBAX3JhZGl4U2VsZWN0SGV4SWRcbiAgICAgICAgICAgICAgICBAc2V0UmFkaXggUkFESVhfSEVYXG4iXX0=