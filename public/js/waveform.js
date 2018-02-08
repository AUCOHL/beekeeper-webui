var Waveform,
  indexOf = [].indexOf;

Waveform = (function() {
  'use strict';
  var BUS_SIGNAL, CANVAS_MAX_HEIGHT, DEFAULT_COLOR, DEFAULT_OPACITY, GRID_SECTIONS, RADIX_BIN, RADIX_DEC, RADIX_HEX, RULER_HEIGHT, SIGNAL_BOX_HEIGHT, SIGNAL_BOX_PADDING, SIGNAL_BOX_WIDTH, SIGNAL_BUS_SLOPE, SIGNAL_HEIGHT, SIGNAL_NAMES_BOX_WIDTH, SIGNAL_NAME_WIDTH, WIRE_SIGNAL, clone, confirmationDialog;

  class Waveform {
    constructor(_containerId, _data, _initDiagram) {
      var busSignal, depth, e, index, j, k, l, layoutNames, len, len1, len10, len2, len3, len4, len5, len6, len7, len8, len9, levels, m, n, o, p, q, r, ref, ref1, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9, s, signal, signalId, signalIndex, signalMap, signalNames, t;
      this._containerId = _containerId;
      this._data = _data;
      this._initDiagram = _initDiagram;
      this._container = $(`#${this._containerId}`);
      if (!this._container.length) {
        return null;
      }
      if (this._data.signal == null) {
        return null;
      }
      this._data = clone(this._data);
      this._initDiagram = clone(this._initDiagram);
      this._data.signal.sort(function(firstSignal, secondSignal) {
        if (firstSignal.name < secondSignal.name) {
          return -1;
        } else if (firstSignal.name > secondSignal.name) {
          return 1;
        } else {
          return 0;
        }
      });
      if (typeof this._initDiagram === 'string') {
        try {
          this._initDiagram = JSON.parse(this._initDiagram);
        } catch (error) {
          e = error;
          this._initDiagram = null;
        }
      }
      if (this._initDiagram != null) {
        signalNames = [];
        ref = this._data.signal;
        for (j = 0, len = ref.length; j < len; j++) {
          signal = ref[j];
          signalNames.push(signal.name);
        }
        layoutNames = [];
        ref1 = this._initDiagram.rendered;
        for (k = 0, len1 = ref1.length; k < len1; k++) {
          signal = ref1[k];
          layoutNames.push(signal);
        }
        ref2 = this._initDiagram.hidden;
        for (l = 0, len2 = ref2.length; l < len2; l++) {
          signal = ref2[l];
          layoutNames.push(signal);
        }
        for (m = 0, len3 = layoutNames.length; m < len3; m++) {
          signal = layoutNames[m];
          if (indexOf.call(signalNames, signal) < 0) {
            console.error('Supplied layout is not compatible with the simulation.');
            this._initDiagram = null;
            break;
          }
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
      ref3 = this.signals;
      for (n = 0, len4 = ref3.length; n < len4; n++) {
        signal = ref3[n];
        signal.originalName = signal.name;
      }
      if (this._initDiagram == null) {
        this.renderedSignals = [];
        this.removedSignals = [];
        this.includedSignals = [];
        this.excludedSignals = [];
        ref4 = this.signals;
        for (o = 0, len5 = ref4.length; o < len5; o++) {
          signal = ref4[o];
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
        ref5 = this._initDiagram.rendered;
        for (p = 0, len6 = ref5.length; p < len6; p++) {
          index = ref5[p];
          if (indexOf.call(this.includedSignals, index) < 0) {
            this.includedSignals.push(index);
          }
        }
        ref6 = this._initDiagram.hidden;
        for (q = 0, len7 = ref6.length; q < len7; q++) {
          index = ref6[q];
          if (indexOf.call(this.excludedSignals, index) < 0) {
            this.excludedSignals.push(index);
          }
        }
        this._initDiagram.rendered = (function() {
          var len8, r, ref7, results;
          ref7 = this.includedSignals;
          results = [];
          for (r = 0, len8 = ref7.length; r < len8; r++) {
            index = ref7[r];
            results.push(index);
          }
          return results;
        }).call(this);
        this._initDiagram.hidden = (function() {
          var len8, r, ref7, results;
          ref7 = this.excludedSignals;
          results = [];
          for (r = 0, len8 = ref7.length; r < len8; r++) {
            index = ref7[r];
            results.push(index);
          }
          return results;
        }).call(this);
        ref7 = this.signals;
        for (r = 0, len8 = ref7.length; r < len8; r++) {
          signal = ref7[r];
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
        ref8 = this._initDiagram.rendered;
        for (s = 0, len9 = ref8.length; s < len9; s++) {
          signalIndex = ref8[s];
          this.renderedSignals.push(signalMap[signalIndex]);
        }
        ref9 = this._initDiagram.hidden;
        for (t = 0, len10 = ref9.length; t < len10; t++) {
          signalIndex = ref9[t];
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
          $(`#${this._radixSelectId}`).val(`${this._radixSelectBinId}`).selectmenu('refresh');
          this.radix = RADIX_BIN;
          this.setRadix(RADIX_BIN);
        } else if (this._initDiagram.radix === RADIX_HEX) {
          $(`#${this._radixSelectId}`).val(`${this._radixSelectHexId}`).selectmenu('refresh');
          this.radix = RADIX_HEX;
          this.setRadix(RADIX_HEX);
        } else if (this._initDiagram.radix === RADIX_DEC) {
          $(`#${this._radixSelectId}`).val(`${this._radixSelectDecId}`).selectmenu('refresh');
          this.radix = RADIX_DEC;
          this.setRadix(RADIX_DEC);
        }
        this.redraw();
      }
    }

    setOnChangeListener(listener) {
      if (typeof listener === 'function') {
        return this._onChangeListener = listener;
      }
    }

    setOnSaveListener(listener) {
      if (typeof listener === 'function') {
        return this._onSaveListener = listener;
      }
    }

    exportTimingDiagram() {
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
    }

    resetTimingDiagram() {
      var busSignal, depth, j, k, len, len1, levels, ref, ref1, signal, signalId;
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
      ref = this.signals;
      for (j = 0, len = ref.length; j < len; j++) {
        signal = ref[j];
        signal.name = signal.originalName;
      }
      this._data.signal.sort(function(firstSignal, secondSignal) {
        if (firstSignal.name < secondSignal.name) {
          return -1;
        } else if (firstSignal.name > secondSignal.name) {
          return 1;
        } else {
          return 0;
        }
      });
      this.signals = this._data.signal;
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
      $(`#${this._radixSelectId}`).val(`${this._radixSelectBinId}`).selectmenu('refresh');
      this.setRadix(RADIX_BIN);
      if (this._onChangeListener) {
        return this._onChangeListener({
          type: 'reset'
        });
      }
    }

    redraw() {
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
        this.highlighted.opacity = DEFAULT_OPACITY.SIGNAL_HIGHLIGHT;
      }
      return this.setCursorTime(this.currentExactTime);
    }

    setCursorTime(exactTime) {
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
    }

    drawGrid(start = this.renderFrom, end = this.renderTo) {
      var currentTarget, i, j, k, len, len1, line, lineCords, linePos, lineStep, ref, ref1, results, text;
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
          fontFamily: 'monospace',
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
    }

    refreshSignalValues() {
      var j, len, ref, val;
      ref = this._signalValueText;
      for (j = 0, len = ref.length; j < len; j++) {
        val = ref[j];
        val.textbox.setText(this._getFormattedValue(val.value, val.width));
      }
      return this._canvas.renderAll();
    }

    drawSignals(start = this.renderFrom, end = this.renderTo) {
      var currentValueSpanWidth, currentValueText, currentValueWidth, highlightRect, initialValue, j, k, len, len1, originX, originY, overflowWidth, ranges, ref, rendered, signal, signalBus, signalIndex, valueIndex, valueObject;
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
          [originX, originY, initialValue] = this._drawValue(valueObject, originX, originY, initialValue, DEFAULT_COLOR.SIGNAL, signalBus !== false);
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
    }

    refreshCurrentValues() {
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
    }

    addSignal() {
      var dialogInstance, dialogMessage, dialogTitle, handleFilter, id, index, isSignalAdded, j, k, len, len1, lvl, parent, part, path, ref, removedSignal, selectableId, self, signalObj, signalParts, signalTree, singalName, title, treeIt;
      title = "Add Signals";
      console.log(this.removedSignals);
      console.log(this.includedSignals);
      console.log(this.excludedSignals);
      this.removedSignals.sort(function(firstSignal, secondSignal) {
        if (firstSignal.signal.name < secondSignal.signal.name) {
          return -1;
        } else if (firstSignal.signal.name > secondSignal.signal.name) {
          return 1;
        } else {
          return 0;
        }
      });
      signalTree = [];
      isSignalAdded = {};
      parent = '';
      ref = this.removedSignals;
      for (index = j = 0, len = ref.length; j < len; index = ++j) {
        removedSignal = ref[index];
        singalName = removedSignal.signal.name;
        signalParts = singalName.split('.');
        treeIt = signalTree.root;
        path = "";
        id = path = parent = "";
        for (lvl = k = 0, len1 = signalParts.length; k < len1; lvl = ++k) {
          part = signalParts[lvl];
          if (lvl === 0) {
            id = path = part;
            parent = "#";
          } else {
            id = path + "." + part;
            parent = path;
            path = id;
          }
          signalObj = {
            "id": id,
            "parent": parent,
            "text": part,
            data: {
              index: index,
              level: lvl,
              signalId: removedSignal.id
            },
            "li_attr": {
              "class": "tree-item tree-file-item"
            },
            type: 'node'
          };
          if (index === 0 && lvl === 0) {
            signalObj.state = {
              opened: true
            };
          }
          if (lvl === signalParts.length - 1) {
            signalObj.type = 'leaf';
          }
          if (isSignalAdded[id] == null) {
            signalTree.push(signalObj);
            isSignalAdded[id] = 1;
          }
        }
      }
      selectableId = `${this._containerId}-waveform-add-signal-select`;
      dialogTitle = "Add Signals";
      dialogMessage = `<div class="dialog-input-group">\n	<label for="filter">Filter: </label>\n	<input type="text" name="filter" id="filter" value="">\n</div>\n<div>\n	<div class="waveform-signal-tree" id="${selectableId}"></div>\n</div>`;
      $(`#${this._modalDialogId}`).html(dialogMessage);
      $(`#${selectableId}`).jstree({
        plugins: ['wholerow', 'types', 'unique', 'search'],
        search: {
          close_opened_onclear: false,
          fuzzy: false,
          case_insensitive: true,
          show_only_matches: true,
          show_only_matches_children: true
        },
        types: {
          default: {
            icon: '/images/tree-icons/Blank.png'
          },
          '#': {
            icon: '/images/tree-icons/Folder.png',
            valid_children: ['node']
          },
          node: {
            icon: '/images/tree-icons/SignalNode.png',
            valid_children: ['leaf']
          },
          leaf: {
            icon: '/images/tree-icons/SignalLeaf.png',
            valid_children: []
          }
        },
        core: {
          themes: {
            name: 'default-dark',
            dots: false
          },
          multiple: true,
          check_callback: function(operation, node, nodeParent, node_position, more) {
            return true;
          },
          data: signalTree
        }
      }).bind('dblclick.jstree', (function(e) {
        var node, nodeId;
        node = $(e.target).closest("li");
        if (node.length) {
          return nodeId = node.attr('id');
        }
      //if nodeId? and nodeId.trim() isnt ''
      //console.log nodeId
      })).bind('select_node.jstree', (function(e, data) {
        var searchClearead;
        if (!searchClearead) {
          $('#files').jstree(true).search('');
          return searchClearead = true;
        }
      })).bind('keypress', (function(e, data) {}));
      //if e.keyCode is 127
      //deleteFile(no)
      handleFilter = (e) => {
        var filterValue;
        filterValue = $("#filter").val().trim().toLowerCase();
        return $(`#${selectableId}`).jstree(true).search(filterValue);
      };
      $("#filter").on('input', handleFilter);
      self = this;
      alertify[`addSignalDialog-${selectableId}`] || alertify.dialog(`addSignalDialog-${selectableId}`, (function() {
        return {
          main: function(content) {
            return this.setContent(content);
          },
          prepare: function() {
            var confirmed, ipId, ipName, ipOwner, ipTopModule, matchId, overwrite, wait;
            confirmed = false;
            ipId = '';
            ipName = '';
            ipTopModule = '';
            ipOwner = '';
            overwrite = false;
            matchId = null;
            return wait = false;
          },
          setup: function() {
            return {
              focus: {
                element: '#filter',
                select: true
              },
              options: {
                title: title,
                maximizable: false,
                resizable: false,
                padding: true,
                closableByDimmer: false,
                transition: 'zoom'
              },
              buttons: [
                {
                  text: 'Add',
                  key: 13,
                  className: alertify.defaults.theme.ok,
                  attrs: {
                    attribute: 'value'
                  },
                  scope: 'auxiliary',
                  element: void 0
                },
                {
                  text: 'Cancel',
                  invokeOnClose: true,
                  className: alertify.defaults.theme.ok,
                  attrs: {
                    attribute: 'value'
                  },
                  scope: 'auxiliary',
                  element: void 0
                }
              ]
            };
          },
          settings: {
            callback: function() {}
          },
          callback: (closeEvent) => {
            var ind, l, len2, len3, len4, m, n, node, nodeId, ref1, rmCounter, rmIndices, rs, selectedSignal, selectionIds, selectionIndex, selectionName;
            if (closeEvent.index === 0) {
              selectionIds = $(`#${selectableId}`).jstree(true).get_selected();
              rmIndices = [];
              for (l = 0, len2 = selectionIds.length; l < len2; l++) {
                id = selectionIds[l];
                node = $(`#${selectableId}`).jstree(true).get_node(id);
                if (node == null) {
                  continue;
                }
                nodeId = node.data.signalId;
                selectedSignal = void 0;
                selectionIndex = node.data.index;
                ref1 = self.removedSignals;
                for (ind = m = 0, len3 = ref1.length; m < len3; ind = ++m) {
                  rs = ref1[ind];
                  if (rs.id === nodeId) {
                    selectedSignal = rs;
                    selectionIndex = ind;
                    break;
                  }
                }
                if (!selectedSignal) {
                  continue;
                }
                if (node && node.type === 'leaf') {
                  selectionName = nodeId;
                  if (indexOf.call(self.includedSignals, selectionName) < 0) {
                    self.renderedSignals.push(selectedSignal);
                    rmIndices.push(selectionIndex);
                    self.excludedSignals.splice(self.excludedSignals.indexOf(selectionName, 1));
                    self.includedSignals.push(selectionName);
                  }
                }
              }
              rmIndices.sort();
              rmCounter = 0;
              for (n = 0, len4 = rmIndices.length; n < len4; n++) {
                ind = rmIndices[n];
                self.removedSignals.splice(ind - rmCounter, 1);
                rmCounter++;
              }
              self.redraw();
              $(`#${self._modalDialogId}`).empty();
              if (self._onChangeListener) {
                return self._onChangeListener({
                  type: 'add'
                });
              }
            }
          },
          hooks: {
            onclose: function() {
              return $(`#${self._modalDialogId}`).html('');
            }
          }
        };
      }), true);
      dialogInstance = alertify[`addSignalDialog-${selectableId}`]($(`#${this._modalDialogId}`).get(0)).set('title', title);
      return;
      return $(`#${this._modalDialogId}`).dialog({
        resizable: true,
        modal: true,
        title: dialogTitle,
        height: 400,
        width: 'auto',
        buttons: {
          'Add': () => {
            var ind, l, len2, len3, m, node, rmCounter, rmIndices, selectionIds, selectionIndex, selectionName;
            selectionIds = $(`#${selectableId}`).jstree(true).get_selected();
            rmIndices = [];
            for (l = 0, len2 = selectionIds.length; l < len2; l++) {
              id = selectionIds[l];
              node = $(`#${selectableId}`).jstree(true).get_node(id);
              if (node && node.type === 'leaf') {
                selectionIndex = node.data.index;
                selectionName = this.removedSignals[selectionIndex].signal.name;
                if (indexOf.call(this.includedSignals, selectionName) < 0) {
                  this.renderedSignals.push(this.removedSignals[selectionIndex]);
                  rmIndices.push(selectionIndex);
                  this.excludedSignals.splice(this.excludedSignals.indexOf(selectionName, 1));
                  this.includedSignals.push(selectionName);
                }
              }
            }
            rmIndices.sort();
            rmCounter = 0;
            for (m = 0, len3 = rmIndices.length; m < len3; m++) {
              ind = rmIndices[m];
              this.removedSignals.splice(ind - rmCounter, 1);
              rmCounter++;
            }
            $(`#${this._modalDialogId}`).dialog('close');
            $(`[aria-describedby="${this._modalDialogId}"]`).remove();
            if (rmIndices.length) {
              this.redraw();
            }
            $(`#${this._modalDialogId}`).empty();
            if (this._onChangeListener) {
              return this._onChangeListener({
                type: 'add'
              });
            }
          },
          'Cancel': function() {
            $(this).dialog('close');
            return $(`[aria-describedby="${this._modalDialogId}"]`).remove();
          }
        },
        close: () => {
          $(`#${this._modalDialogId}`).empty();
          return $(`[aria-describedby="${this._modalDialogId}"]`).remove();
        }
      });
    }

    removeSignal() {
      var dialogMessage, dialogTitle, signal, signalIndex, signalName;
      if (!this.highlighted) {
        return;
      }
      signalIndex = this.renderedSignals.indexOf(this.highlighted.signal);
      signal = this.highlighted.signal.signal;
      signalName = signal.name;
      dialogTitle = `Remove Signal ${signalName}?`;
      dialogMessage = "<table><tbody><tr><td><i class=\"fa fa-exclamation-triangle fa-2x\" aria-hidden=\"true\" style=\"vertical-align: middle;\"></i></td><td style=\"padding-left: 1em;\"><p>Do you want to remove the selected signal?</p></td></tr></tbody></table>";
      confirmationDialog.bind(this)(dialogTitle, dialogMessage, (confirmed) => {
        if (confirmed) {
          if (this.highlighted) {
            this.highlighted.fill = void 0;
            this.highlighted.opacity = 0;
          }
          this.highlighted = void 0;
          this.highlightedIndex = void 0;
          if (indexOf.call(this.excludedSignals, signalIndex) < 0) {
            this.removedSignals.push(this.renderedSignals[signalIndex]);
            this.renderedSignals.splice(signalIndex, 1);
            this.excludedSignals.push(signalIndex);
            this.includedSignals.splice(this.includedSignals.indexOf(signalIndex, 1));
            this.redraw();
          }
          if (this._onChangeListener) {
            return this._onChangeListener({
              type: 'remove'
            });
          }
        }
      });
      return;
      $(`#${this._modalDialogId}`).html(dialogMessage);
      return $(`#${this._modalDialogId}`).dialog({
        resizable: false,
        modal: true,
        title: dialogTitle,
        height: 150,
        width: 320,
        buttons: {
          'Remove': () => {},
          'Cancel': function() {
            $(this).dialog('close');
            return $(`[aria-describedby="${this._modalDialogId}"]`).remove();
          }
        },
        close: () => {
          return $(`#${this._modalDialogId}`).html('');
        }
      });
    }

    moveFirst() {
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
    }

    moveLeft() {
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
    }

    moveRight() {
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
    }

    zoomIn() {
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
      if (this.scaleFactor < 0.02) {
        return;
      }
      if (factor) {
        this.renderFrom = newFrom;
        this.renderTo = newTo;
        this.redraw();
        return this.setCursorTime(this.currentExactTime);
      }
    }

    zoomOut() {
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
    }

    zoomAll() {
      if (this.renderFrom === 0 && this.renderTo === this.endTime) {
        return;
      }
      this.renderFrom = 0;
      this.renderTo = this.endTime;
      this.redraw();
      return this.setCursorTime(this.currentExactTime);
    }

    setRadix(newRadix) {
      var changed;
      if (newRadix !== RADIX_BIN && newRadix !== RADIX_DEC && newRadix !== RADIX_HEX) {
        return;
      }
      changed = this.radix !== newRadix;
      this.radix = newRadix;
      this.refreshCurrentValues();
      this.refreshSignalValues();
      if (changed) {
        return this.redraw();
      }
    }

    isBus(signalName) {
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
    }

    clearCanvas() {
      return this._canvas.clear();
    }

    binToDec(value) {
      return Number.parseInt(value, 2).toString(10);
    }

    binToHex(value) {
      return Number.parseInt(value, 2).toString(16).toUpperCase();
    }

    pad(value, width, padding = '0') {
      value = value + '';
      if (value.length >= width) {
        return value;
      } else {
        return new Array(width - value.length + 1).join(padding) + value;
      }
    }

    pointDist(x1, y1, x2, y2) {
      return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    getRandomColor() {
      var color, i, j, letters;
      letters = '0123456789ABCDEF'.split('');
      color = '#';
      for (i = j = 0; j < 6; i = ++j) {
        color += letters[Math.floor(Math.random() * 16)];
      }
      return color;
    }

    ceilInt(value, divis) {
      value = Math.round(value);
      while (value % divis) {
        value++;
      }
      return value;
    }

    floorInt(value, divis) {
      value = Math.round(value);
      while (value % divis) {
        value--;
      }
      return value;
    }

    roundInt(value, divis) {
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
    }

    ceilFive(value) {
      return this.ceilInt(value, 5);
    }

    floorFive(value) {
      return this.floorInt(value, 5);
    }

    roundFive(value) {
      return this.roundInt(value, 5);
    }

    _initCanvas() {
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
      this._canvas.on('mouse:down', (options) => {
        var pointer;
        if (options.target) {
          pointer = this._canvas.getPointer(options.e);
          if (options.target.signal) {
            if (this.highlighted) {
              this.highlighted.fill = void 0;
              this.highlighted.opacity = 0;
            }
            this.highlighted = options.target;
            this.highlightedIndex = this.renderedSignals.indexOf(options.target.signal);
            options.target.fill = DEFAULT_COLOR.SIGNAL_HIGHLIGHT;
            options.target.opacity = DEFAULT_OPACITY.SIGNAL_HIGHLIGHT;
          } else {
            if (this.highlighted) {
              this.highlighted.fill = void 0;
              this.highlighted.opacity = 0;
            }
            this.highlighted = void 0;
            this.highlightedIndex = void 0;
          }
          if (options.target.signal) {
            this._draggedSignal = options.target;
            this._draggedOriginalX = options.target.left;
            this._draggedOriginalY = options.target.top;
            this._draggedMouseX = pointer.x;
            this._draggedMouseY = pointer.y;
          }
          this._isDragging = true;
          return this._canvas.renderAll();
        }
      });
      this._canvas.on('mouse:move', (options) => {
        var pointer;
        if (this._isDragging) {
          pointer = this._canvas.getPointer(options.e);
          if (this._draggedSignal != null) {
            this._draggedSignal.setTop((pointer.y - this._draggedMouseY) + this._draggedOriginalY);
            this._draggedSignal.opacity = DEFAULT_OPACITY.SIGNAL_DRAGGED;
          }
          if ((this._dragRectangle != null) && options.target !== this._dragRectangle) {
            this._dragRectangle.setHeight(this._dragRectangleOriginalHeight);
            this._dragRectangleOriginalHeight = void 0;
            this._dragRectangle.fill = void 0;
            this._dragRectangle.opacity = 0;
            this._dragRectangle = void 0;
          }
          if (options.target && options.target.signal && options.target !== this._draggedSignal && options.target !== this._dragRectangle) {
            this._dragRectangle = options.target;
            this._dragRectangle.fill = DEFAULT_COLOR.SIGNAL_DRAGGED;
            this._dragRectangle.opacity = DEFAULT_OPACITY.SIGNAL_DRAGGED;
            this._dragRectangleOriginalHeight = this._dragRectangle.height;
            this._dragRectangle.setHeight(this._dragRectangle.height / 2.0);
          }
          return this._canvas.renderAll();
        }
      });
      return this._canvas.on('mouse:up', (options) => {
        var pointer, sourceIndex, targetIndex, validTarget;
        if (this._isDragging) {
          validTarget = options.target && options.target.signal && this._draggedSignal !== options.target;
          if (this._draggedSignal != null) {
            if (this._draggedOriginalX != null) {
              if (validTarget) {
                //Swap Signals
                sourceIndex = this.renderedSignals.indexOf(this._draggedSignal.signal);
                targetIndex = this.renderedSignals.indexOf(options.target.signal);
                this.renderedSignals.splice(targetIndex, 0, this.renderedSignals.splice(sourceIndex, 1)[0]);
                this._draggedSignal.set({
                  left: this._draggedOriginalX,
                  top: this._draggedOriginalY
                });
                if (this._dragRectangle != null) {
                  this._dragRectangle.setHeight(this._dragRectangleOriginalHeight);
                  this._dragRectangle.fill = void 0;
                  this._dragRectangleOriginalHeight = void 0;
                  this._dragRectangle.opacity = 0;
                  this._dragRectangle = void 0;
                }
                this.highlightedIndex = targetIndex;
                this.redraw();
                if (this._onChangeListener) {
                  this._onChangeListener({
                    type: 'sort'
                  });
                }
              } else {
                this._draggedSignal.set({
                  left: this._draggedOriginalX,
                  top: this._draggedOriginalY
                });
              }
            }
          }
        }
        if (this._dragRectangle != null) {
          this._dragRectangle.setHeight(this._dragRectangleOriginalHeight);
          this._dragRectangleOriginalHeight = void 0;
          this._dragRectangle.fill = void 0;
          this._dragRectangle.opacity = 0;
          this._dragRectangle = void 0;
        }
        this._isDragging = false;
        this._draggedSignal = void 0;
        this._draggedOriginalX = void 0;
        this._draggedOriginalY = void 0;
        this._draggedMouseX = void 0;
        this._draggedMouseY = void 0;
        pointer = this._canvas.getPointer(options.e);
        if (pointer.x > SIGNAL_NAMES_BOX_WIDTH) {
          this.setCursorTime(this._posToTime(pointer.x, null, false));
        }
        return this._canvas.renderAll();
      });
    }

    _drawValue(valueObject, originX, originY, initialValue, signalColor = DEFAULT_COLOR.SIGNAL, busSignal = false, start = this.renderFrom, end = this.renderTo) {
      var centrePoint, endPos, isLast, lastPoint, pointsTime, polyLine, polyPoints, polyText, polyWidth, startPos, textValue, textWidth, value, widthOverflow;
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
          fontFamily: 'monospace',
          fontSize: 11,
          selectable: false,
          hasControls: false,
          hasRotatingPoint: false,
          fill: DEFAULT_COLOR.SIGNAL_VALUE
        });
        textValue = ' ' + polyText.text;
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
        polyText.set('left', centrePoint.x - polyText.width / 2.0);
        polyText.set('top', centrePoint.y - polyText.height / 2.0);
        this._signalValueText.push({
          textbox: polyText,
          width: valueObject.width,
          value: value
        });
        this._canvas.add(polyText);
        return [this._timeToPos(valueObject.end), originY, value, polyLine];
      }
    }

    _getGridLine(coords) {
      return new fabric.Line(coords, {
        fill: DEFAULT_COLOR.GRID_LINE,
        stroke: DEFAULT_COLOR.GRID_LINE,
        strokeWidth: 1,
        opacity: 0.3,
        selectable: false,
        hasControls: false,
        hasRotatingPoint: false
      });
    }

    _drawSignalNames() {
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
          fontFamily: 'monospace',
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
          fontFamily: 'monospace',
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
    }

    _getSignalValues(wave, start = this.renderFrom, end = this.renderTo) {
      var _between, newValue, valueAdded, valueEnd, valueStart, values, waveIndex, waveValue;
      if (wave.length === 0) {
        return [];
      }
      values = [];
      valueAdded = false;
      waveIndex = 0;
      _between = function(val, startRange = start, endRange = end) {
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
    }

    _timeToPos(time, from = this.renderFrom, round = true) {
      if (round) {
        return Math.round(SIGNAL_NAMES_BOX_WIDTH + time * this._renderDistanceFactor - Math.round(from * this._renderDistanceFactor));
      } else {
        return SIGNAL_NAMES_BOX_WIDTH + time * this._renderDistanceFactor - from * this._renderDistanceFactor;
      }
    }

    _posToTime(pos, from = this.renderFrom, round = true) {
      if (round) {
        return Math.round((pos - SIGNAL_NAMES_BOX_WIDTH) / this._renderDistanceFactor) + Math.round(from);
      } else {
        return (pos - SIGNAL_NAMES_BOX_WIDTH) / this._renderDistanceFactor + from;
      }
    }

    _getFormattedValue(value, length = 8) {
      if (this.radix === RADIX_DEC) {
        if (value === 'x') {
          return `${this.pad(value, length, 'x')}`;
        } else if (value.toLowerCase() === 'z') {
          return `${this.pad(value, length, 'z')}`;
        } else {
          return `${this.binToDec(value)}`;
        }
      } else if (this.radix === RADIX_HEX) {
        if (value === 'x') {
          return `${this.pad(value, length, 'x')}`;
        } else if (value.toLowerCase() === 'z') {
          return `${this.pad(value, length, 'z')}`;
        } else {
          return `0x${this.binToHex(value)}`;
        }
      } else if (this.radix === RADIX_BIN) {
        if (value === 'x') {
          return `${this.pad(value, length, 'x')}`;
        } else if (value.toLowerCase() === 'z') {
          return `${this.pad(value, length, 'z')}`;
        } else {
          return `${this.pad(value, length)}`;
        }
      }
    }

    _initLayout() {
      this._addSignalButtonId = `${this._containerId}-waveform-add-btn`;
      this._addSignalButton = $(`<button class="waveform-toolbar-btn" id="${this._addSignalButtonId}">Add Sginal</button>`);
      this._removeSignalButtonId = `${this._containerId}-waveform-remove-btn`;
      this._removeSignalButton = $(`<button class="waveform-toolbar-btn" id="${this._removeSignalButtonId}">Remove Sginal</button>`);
      this._zoomInButtonId = `${this._containerId}-waveform-zoomin-btn`;
      this._zoomInButton = $(`<button class="waveform-toolbar-btn" id="${this._zoomInButtonId}">Zoom In</button>`);
      this._zoomOutButtonId = `${this._containerId}-waveform-zoomout-btn`;
      this._zoomOutButton = $(`<button class="waveform-toolbar-btn" id="${this._zoomOutButtonId}">Zoom Out</button>`);
      this._zoomAllButtonId = `${this._containerId}-waveform-zoomall-btn`;
      this._zoomAllButton = $(`<button class="waveform-toolbar-btn" id="${this._zoomAllButtonId}">Zoom All</button>`);
      this._gotoFirstButtonId = `${this._containerId}-waveform-gotofirst-btn`;
      this._gotoFirstButton = $(`<button class="waveform-toolbar-btn" id="${this._gotoFirstButtonId}">Goto First</button>`);
      this._goLeftButtonId = `${this._containerId}-waveform-goleft-btn`;
      this._goLeftButton = $(`<button class="waveform-toolbar-btn" id="${this._goLeftButtonId}">Go Left</button>`);
      this._goRightButtonId = `${this._containerId}-waveform-goright-btn`;
      this._goRightButton = $(`<button class="waveform-toolbar-btn" id="${this._goRightButtonId}">Go Right</button>`);
      this._resetButtonId = `${this._containerId}-waveform-reset-btn`;
      this._resetButton = $(`<button class="waveform-toolbar-btn" id="${this._goRightButtonId}">Reset Timing Diagram</button>`);
      this._radixSelectBinId = `${this._containerId}-waveform-radix-bin`;
      this._optionBin = $(`<option class="waveform-toolbar-option" id="${this._radixSelectBinId}" value="${this._radixSelectBinId}" selected>Binary</option>`);
      this._radixSelectDecId = `${this._containerId}-waveform-radix-dec`;
      this._optionDec = $(`<option class="waveform-toolbar-option" id="${this._radixSelectDecId}" value="${this._radixSelectDecId}">Decimal</option>`);
      this._radixSelectHexId = `${this._containerId}-waveform-radix-hex`;
      this._optionHex = $(`<option class="waveform-toolbar-option" id="${this._radixSelectHexId}" value="${this._radixSelectHexId}">Hexadecimal</option>`);
      this._radixSelectId = `${this._containerId}-waveform-radix-select`;
      this._radixSelectLabelId = `${this._containerId}-waveform-radix-select-label`;
      this._radixSelectLabel = $(`<label class="waveform-toolbar-label" id="${this._radixSelectLabelId}" for="${this._radixSelectId}">Select a speed</label>`);
      this._radixSelect = $(`<select class="waveform-toolbar-select" name="radix-select" id="${this._radixSelectId}"></select>`);
      this._cursorValueId = `${this._containerId}-waveform-toolbar-cursor-value`;
      this._cursorValueDiv = $(`<div id="${this._cursorValueId}" class="cursor-toolbar-value">Cursor: 0ns</div>`);
      this._modalDialogId = `${this._containerId}-waveform-modal`;
      this._modalDialog = $(`<div id="${this._modalDialogId}"></div>`);
      this._toolbardId = `${this._containerId}-waveform-toolbar`;
      this._waveformToolbar = $(`<div id="${this._toolbardId}" class="ui-widget-header ui-corner-all waveform-toolbar"></div>`);
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
      this._canvasId = `${this._containerId}-waveform-canvas`;
      this._canvasWrapper = $(`<canvas class="waveform-canvas" id="${this._canvasId}"></canvas>`);
      this._canvasViewportId = `${this._containerId}-waveform-canvas-viewport`;
      this._canvasViewport = $(`<div class="canvas-viewport" id="${this._canvasViewportId}"></div>`);
      this._canvasViewport.append(this._canvasWrapper);
      this._container.append(this._canvasViewport);
      this.canvasHeight = CANVAS_MAX_HEIGHT;
      this.canvasWidth = this._container.width();
      this.viewportHeight = this._container.height();
      this.canvasHeight = CANVAS_MAX_HEIGHT;
      this._canvasViewport.attr('tabIndex', 1000);
      $(`#${this._canvasViewportId}`).keydown((e) => {
        if (e.keyCode === 38) {
          if (this.highlighted) {
            this.highlighted.fill = void 0;
            this.highlighted.opacity = 0;
          }
          this.highlightedIndex--;
          if (this.highlightedIndex < 0) {
            this.highlightedIndex = this.renderedSignals.length - 1;
          }
          this.highlighted = this.renderedSignals[this.highlightedIndex].highlight;
          this.highlighted.fill = DEFAULT_COLOR.SIGNAL_HIGHLIGHT;
          this.highlighted.opacity = DEFAULT_OPACITY.SIGNAL_HIGHLIGHT;
          this._canvas.renderAll();
          this.setCursorTime(this.currentExactTime);
          return e.preventDefault();
        } else if (e.keyCode === 40) {
          if (this.highlighted) {
            this.highlighted.fill = void 0;
            this.highlighted.opacity = 0;
          }
          this.highlightedIndex++;
          if (this.highlightedIndex >= this.renderedSignals.length) {
            this.highlightedIndex = 0;
          }
          this.highlighted = this.renderedSignals[this.highlightedIndex].highlight;
          this.highlighted.fill = DEFAULT_COLOR.SIGNAL_HIGHLIGHT;
          this.highlighted.opacity = DEFAULT_OPACITY.SIGNAL_HIGHLIGHT;
          this._canvas.renderAll();
          this.setCursorTime(this.currentExactTime);
          return e.preventDefault();
        } else if (e.ctrlKey && e.keyCode === 83) {
          if (this._onSaveListener) {
            this._onSaveListener(this.exportTimingDiagram());
          }
          return e.preventDefault();
        }
      });
      this._addSignalButton.button({
        text: false,
        icons: {
          primary: 'ui-icon-plus'
        }
      });
      this._addSignalButton.click((e) => {
        return this.addSignal();
      });
      this._removeSignalButton.button({
        text: false,
        icons: {
          primary: 'ui-icon-minus'
        }
      });
      this._removeSignalButton.click((e) => {
        return this.removeSignal();
      });
      this._zoomInButton.button({
        text: false,
        icons: {
          primary: 'ui-icon-zoomin'
        }
      });
      this._zoomInButton.click((e) => {
        return this.zoomIn();
      });
      this._zoomOutButton.button({
        text: false,
        icons: {
          primary: 'ui-icon-zoomout'
        }
      });
      this._zoomOutButton.click((e) => {
        return this.zoomOut();
      });
      this._zoomAllButton.button({
        text: false,
        icons: {
          primary: 'ui-icon-arrow-4-diag'
        }
      });
      this._zoomAllButton.click((e) => {
        return this.zoomAll();
      });
      this._gotoFirstButton.button({
        text: false,
        icons: {
          primary: 'ui-icon-arrowstop-1-w'
        }
      });
      this._gotoFirstButton.click((e) => {
        return this.moveFirst();
      });
      this._goLeftButton.button({
        text: false,
        icons: {
          primary: 'ui-icon-triangle-1-w'
        }
      });
      this._goLeftButton.click((e) => {
        return this.moveLeft();
      });
      this._goRightButton.button({
        text: false,
        icons: {
          primary: 'ui-icon-triangle-1-e'
        }
      });
      this._goRightButton.click((e) => {
        return this.moveRight();
      });
      this._resetButton.button({
        text: false,
        icons: {
          primary: 'ui-icon-arrowrefresh-1-n'
        }
      });
      this._resetButton.click((e) => {
        return this.resetTimingDiagram();
      });
      this._radixSelect.selectmenu();
      $(`#${this._containerId}-waveform-radix-select-button`).css('display', 'inline-table');
      $(`#${this._containerId}-waveform-radix-select-button`).find('.ui-selectmenu-text').css('line-height', '0.6');
      return this._radixSelect.on("selectmenuchange", (ui, e) => {
        var selectedRadixId;
        selectedRadixId = e.item.value;
        if (selectedRadixId === this._radixSelectBinId) {
          return this.setRadix(RADIX_BIN);
        } else if (selectedRadixId === this._radixSelectDecId) {
          return this.setRadix(RADIX_DEC);
        } else if (selectedRadixId === this._radixSelectHexId) {
          return this.setRadix(RADIX_HEX);
        }
      });
    }

  };

  RULER_HEIGHT = 14;

  GRID_SECTIONS = 11;

  SIGNAL_NAMES_BOX_WIDTH = 280;

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

  clone = function(obj) {
    var key, temp;
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    temp = new obj.constructor();
    for (key in obj) {
      temp[key] = clone(obj[key]);
    }
    return temp;
  };

  confirmationDialog = function(title, htmlContent, cb, width = 350, height = 150) {
    var confirmed;
    $(`#${this._modalDialogId}`).html(htmlContent);
    confirmed = false;
    alertify.waveformConfirmationDialog || alertify.dialog('waveformConfirmationDialog', (function() {
      return {
        main: function(content) {
          return this.setContent(content);
        },
        prepare: function() {
          return confirmed = false;
        },
        setup: function() {
          return {
            options: {
              title: title,
              maximizable: false,
              resizable: false,
              padding: true,
              closableByDimmer: false,
              transition: 'zoom'
            },
            buttons: [
              {
                text: 'OK',
                key: 13,
                className: alertify.defaults.theme.ok,
                attrs: {
                  attribute: 'value'
                },
                scope: 'auxiliary',
                element: void 0
              },
              {
                text: 'Cancel',
                invokeOnClose: true,
                className: alertify.defaults.theme.ok,
                attrs: {
                  attribute: 'value'
                },
                scope: 'auxiliary',
                element: void 0
              }
            ]
          };
        },
        callback: function(closeEvent) {
          if (closeEvent.index === 0) {
            return confirmed = true;
          }
        },
        settings: {
          callback: function() {}
        },
        hooks: {
          onclose: function() {
            $(`#${this._modalDialogId}`).html('');
            return this.settings.callback(confirmed);
          }
        }
      };
    }), true);
    return alertify.waveformConfirmationDialog($(`#${this._modalDialogId}`).get(0)).set('title', title).set('callback', cb);
  };

  return Waveform;

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbImluZGV4LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBLFFBQUE7RUFBQTs7QUFBTTtFQUNMOzs7RUFERCxNQUFBLFNBQUE7SUFpREMsV0FBYSxhQUFBLE9BQUEsY0FBQSxDQUFBO0FBQ1osVUFBQSxTQUFBLEVBQUEsS0FBQSxFQUFBLENBQUEsRUFBQSxLQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsV0FBQSxFQUFBLEdBQUEsRUFBQSxJQUFBLEVBQUEsS0FBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUEsTUFBQSxFQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLEdBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxDQUFBLEVBQUEsTUFBQSxFQUFBLFFBQUEsRUFBQSxXQUFBLEVBQUEsU0FBQSxFQUFBLFdBQUEsRUFBQTtNQURhLElBQUMsQ0FBQTtNQUFjLElBQUMsQ0FBQTtNQUFPLElBQUMsQ0FBQTtNQUNyQyxJQUFDLENBQUEsVUFBRCxHQUFjLENBQUEsQ0FBRSxDQUFBLENBQUEsQ0FBQSxDQUFJLElBQUMsQ0FBQSxZQUFMLENBQUEsQ0FBRjtNQUNkLElBQUEsQ0FBbUIsSUFBQyxDQUFBLFVBQVUsQ0FBQyxNQUEvQjtBQUFBLGVBQU8sS0FBUDs7TUFDQSxJQUFtQix5QkFBbkI7QUFBQSxlQUFPLEtBQVA7O01BQ0EsSUFBQyxDQUFBLEtBQUQsR0FBUyxLQUFBLENBQU0sSUFBQyxDQUFBLEtBQVA7TUFDVCxJQUFDLENBQUEsWUFBRCxHQUFnQixLQUFBLENBQU0sSUFBQyxD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LEVBQU0sV0FOUDtnQkFPQyxPQUFBLEVBQVM7Y0FQVixDQVZPOztVQVBSO1FBREssQ0FKUDtRQWdDQSxRQUFBLEVBQVUsUUFBQSxDQUFDLFVBQUQsQ0FBQTtVQUNULElBQUcsVUFBVSxDQUFDLEtBQVgsS0FBb0IsQ0FBdkI7bUJBQ0MsU0FBQSxHQUFZLEtBRGI7O1FBRFMsQ0FoQ1Y7UUFtQ0EsUUFBQSxFQUNDO1VBQUEsUUFBQSxFQUFVLFFBQUEsQ0FBQSxDQUFBLEVBQUE7UUFBVixDQXBDRDtRQXFDQSxLQUFBLEVBQ0M7VUFBQSxPQUFBLEVBQVMsUUFBQSxDQUFBLENBQUE7WUFDUixDQUFBLENBQUUsQ0FBQSxDQUFBLENBQUEsQ0FBSSxJQUFDLENBQUEsY0FBTCxDQUFBLENBQUYsQ0FBd0IsQ0FBQyxJQUF6QixDQUE4QixFQUE5QjttQkFDQSxJQUFDLENBQUEsUUFBUSxDQUFDLFFBQVYsQ0FBbUIsU0FBbkI7VUFGUTtRQUFUO01BdENEO0lBRG9GLENBQUQsQ0FBN0MsRUEwQ3BDLElBMUNvQztXQTJDdkMsUUFBUSxDQUFDLDBCQUFULENBQW9DLENBQUEsQ0FBRSxDQUFBLENBQUEsQ0FBQSxDQUFJLElBQUMsQ0FBQSxjQUFMLENBQUEsQ0FBRixDQUF3QixDQUFDLEdBQXpCLENBQTZCLENBQTdCLENBQXBDLENBQW9FLENBQUMsR0FBckUsQ0FBeUUsT0FBekUsRUFBa0YsS0FBbEYsQ0FBd0YsQ0FBQyxHQUF6RixDQUE2RixVQUE3RixFQUF5RyxFQUF6RztFQWhEb0IiLCJzb3VyY2VzQ29udGVudCI6WyJjbGFzcyBXYXZlZm9ybVxuXHQndXNlIHN0cmljdCdcblx0UlVMRVJfSEVJR0hUID0gMTRcblx0R1JJRF9TRUNUSU9OUyA9IDExXG5cdFNJR05BTF9OQU1FU19CT1hfV0lEVEggPSAyODBcblx0U0lHTkFMX05BTUVfV0lEVEggPSAxNTBcblx0U0lHTkFMX0JPWF9IRUlHSFQgPSAyMFxuXHRTSUdOQUxfQk9YX1dJRFRIID0gMTYwXG5cdFNJR05BTF9CT1hfUEFERElORyA9IDhcblx0U0lHTkFMX0hFSUdIVCA9IDIwXG5cdFNJR05BTF9CVVNfU0xPUEUgPSAzXG5cblx0V0lSRV9TSUdOQUwgPSAwXG5cdEJVU19TSUdOQUwgPSAxXG5cblx0UkFESVhfQklOID0gMFxuXHRSQURJWF9ERUMgPSAxXG5cdFJBRElYX0hFWCA9IDJcblxuXHRDQU5WQVNfTUFYX0hFSUdIVCA9IDMwMDBcblxuXHRERUZBVUxUX0NPTE9SID1cblx0XHRcdFx0XHRDQU5WQVNfQkFDS0dST1VORDogJ2JsYWNrJ1xuXHRcdFx0XHRcdENVUlNPUjogJ3JnYig2NCwgMTg2LCAyNTUpJ1xuXHRcdFx0XHRcdEdSSURfVEVYVDogJ2dyYXknXG5cdFx0XHRcdFx0U0lHTkFMOiAncmdiKDgsIDI1NSwgNDApJ1xuXHRcdFx0XHRcdFNJR05BTF9OQU1FX1JFQ1Q6ICdncmF5J1xuXHRcdFx0XHRcdFNJR05BTF9ISUdITElHSFQ6ICdyZ2IoOTcsIDI1NSwgMCknXG5cdFx0XHRcdFx0U0lHTkFMX0RDOiAncmVkJ1xuXHRcdFx0XHRcdFNJR05BTF9JTVBFRDogJ2JsdWUnXG5cdFx0XHRcdFx0U0lHTkFMX0RSQUdHRUQ6ICdyZ2IoMTk3LCAyNTUsIDE0NSknXG5cdFx0XHRcdFx0R1JJRF9MSU5FOiAnZ3JheSdcblx0XHRcdFx0XHRTSUdOQUxfTkFNRTogJ3doaXRlJ1xuXHRcdFx0XHRcdFNJR05BTF9WQUxVRTogJ3doaXRlJ1xuXHRcdFx0XHRcdFNJR05BTF9DVVJSRU5UX1ZBTFVFOiAnd2hpdGUnXG5cdFx0XHRcdFx0Q1VSUkVOVF9WQUxVRV9MSU5FOiAnd2hpdGUnXG5cblx0REVGQVVMVF9PUEFDSVRZID1cblx0XHRcdFx0XHRDVVJTT1I6IDEuMFxuXHRcdFx0XHRcdFNJR05BTF9OQU1FX1JFQ1Q6IDAuMlxuXHRcdFx0XHRcdFNJR05BTF9ISUdITElHSFQ6IDAuM1xuXHRcdFx0XHRcdFNJR05BTF9EUkFHR0VEOiAwLjNcblx0Y2xvbmUgPSAob2JqKSAtPlxuXHRcdHJldHVybiBvYmogIGlmIG9iaiBpcyBudWxsIG9yIHR5cGVvZiAob2JqKSBpc250IFwib2JqZWN0XCJcblx0XHR0ZW1wID0gbmV3IG9iai5jb25zdHJ1Y3RvcigpXG5cdFx0Zm9yIGtleSBvZiBvYmpcblx0XHRcdHRlbXBba2V5XSA9IGNsb25lKG9ialtrZXldKVxuXHRcdHRlbXBcblxuXHRjb25zdHJ1Y3RvcjogKEBfY29udGFpbmVySWQsIEBfZGF0YSwgQF9pbml0RGlhZ3JhbSkgLT5cblx0XHRAX2NvbnRhaW5lciA9ICQoXCIjI3tAX2NvbnRhaW5lcklkfVwiKVxuXHRcdHJldHVybiBudWxsIHVubGVzcyBAX2NvbnRhaW5lci5sZW5ndGhcblx0XHRyZXR1cm4gbnVsbCB1bmxlc3MgQF9kYXRhLnNpZ25hbD9cblx0XHRAX2RhdGEgPSBjbG9uZShAX2RhdGEpXG5cdFx0QF9pbml0RGlhZ3JhbSA9IGNsb25lKEBfaW5pdERpYWdyYW0pXG5cblx0XHRAX2RhdGEuc2lnbmFsLnNvcnQgKGZpcnN0U2lnbmFsLCBzZWNvbmRTaWduYWwpIC0+XG5cdFx0XHRpZiBmaXJzdFNpZ25hbC5uYW1lIDwgc2Vjb25kU2lnbmFsLm5hbWVcblx0XHRcdFx0LTFcblx0XHRcdGVsc2UgaWYgZmlyc3RTaWduYWwubmFtZSA+IHNlY29uZFNpZ25hbC5uYW1lXG5cdFx0XHRcdDFcblx0XHRcdGVsc2Vcblx0XHRcdFx0MFxuXG5cdFx0aWYgdHlwZW9mIEBfaW5pdERpYWdyYW0gaXMgJ3N0cmluZydcblx0XHRcdHRyeVxuXHRcdFx0XHRAX2luaXREaWFncmFtID0gSlNPTi5wYXJzZSBAX2luaXREaWFncmFtXG5cdFx0XHRjYXRjaCBlXG5cdFx0XHRcdEBfaW5pdERpYWdyYW0gPSBudWxsXG5cdFx0aWYgQF9pbml0RGlhZ3JhbT9cblx0XHRcdHNpZ25hbE5hbWVzID0gW11cblx0XHRcdGZvciBzaWduYWwgaW4gQF9kYXRhLnNpZ25hbFxuXHRcdFx0XHRzaWduYWxOYW1lcy5wdXNoIHNpZ25hbC5uYW1lXG5cdFx0XHRsYXlvdXROYW1lcyA9IFtdXG5cdFx0XHRmb3Igc2lnbmFsIGluIEBfaW5pdERpYWdyYW0ucmVuZGVyZWRcblx0XHRcdFx0bGF5b3V0TmFtZXMucHVzaCBzaWduYWxcblx0XHRcdGZvciBzaWduYWwgaW4gQF9pbml0RGlhZ3JhbS5oaWRkZW5cblx0XHRcdFx0bGF5b3V0TmFtZXMucHVzaCBzaWduYWxcblx0XHRcdGZvciBzaWduYWwgaW4gbGF5b3V0TmFtZXNcblx0XHRcdFx0dW5sZXNzIHNpZ25hbCBpbiBzaWduYWxOYW1lc1xuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IgJ1N1cHBsaWVkIGxheW91dCBpcyBub3QgY29tcGF0aWJsZSB3aXRoIHRoZSBzaW11bGF0aW9uLidcblx0XHRcdFx0XHRAX2luaXREaWFncmFtID0gbnVsbFxuXHRcdFx0XHRcdGJyZWFrXG5cblx0XHRAdGltZVNjYWxlID0gQF9kYXRhLnNjYWxlLm1hdGNoIC8oXFxkKykvXG5cdFx0QHRpbWVTY2FsZVVuaXQgPSBAX2RhdGEuc2NhbGUubWF0Y2ggLyhcXEQrKS9cblx0XHRyZXR1cm4gbnVsbCBpZiBub3QgQHRpbWVTY2FsZT8gb3Igbm90IEB0aW1lU2NhbGVVbml0XG5cdFx0QHRpbWVTY2FsZSA9IEB0aW1lU2NhbGVbMF1cblx0XHRAdGltZVNjYWxlVW5pdCA9IEB0aW1lU2NhbGVVbml0WzBdXG5cdFx0QHRpbWVVbml0ID0gcGFyc2VJbnQgQHRpbWVTY2FsZVxuXHRcdGlmIEB0aW1lU2NhbGVVbml0IGlzICducydcblx0XHRcdEB0aW1lVW5pdCAqPSAxMDAwXG5cblx0XHRAcmFkaXggPSBSQURJWF9CSU5cblxuXHRcdEBvcmlnaW5hbEVuZFRpbWUgPSBAX2RhdGEuZW5kdGltZVxuXHRcdEBlbmRUaW1lID0gQGNlaWxGaXZlIEBvcmlnaW5hbEVuZFRpbWVcblx0XHRAcmVuZGVyRnJvbSA9IDBcblx0XHRpZiBAb3JpZ2luYWxFbmRUaW1lID4gMTAwXG5cdFx0XHRAcmVuZGVyVG8gPSBAZmxvb3JJbnQgQGVuZFRpbWUsIDEwMFxuXHRcdGVsc2Vcblx0XHRcdEByZW5kZXJUbyA9IEByb3VuZEludCAoQGVuZFRpbWUgLyAyLjApLCAxMFxuXHRcdEBzaWduYWxzID0gQF9kYXRhLnNpZ25hbFxuXG5cdFx0QF9vbkNoYW5nZUxpc3RlbmVyID0gdW5kZWZpbmVkXG5cdFx0QF9vblNhdmVMaXN0ZW5lciA9IHVuZGVmaW5lZFxuXG5cdFx0aWYgQF9pbml0RGlhZ3JhbT9cblx0XHRcdGlmIEBfaW5pdERpYWdyYW0uZnJvbT9cblx0XHRcdFx0QHJlbmRlckZyb20gPSBAX2luaXREaWFncmFtLmZyb21cblx0XHRcdGlmIEBfaW5pdERpYWdyYW0udG8/XG5cdFx0XHRcdEByZW5kZXJUbyA9IEBfaW5pdERpYWdyYW0udG9cblx0XHRcdGlmIEBfaW5pdERpYWdyYW0uZW5kP1xuXHRcdFx0XHRAZW5kVGltZSA9IEBfaW5pdERpYWdyYW0uZW5kXG5cdFx0XHRpZiBAX2luaXREaWFncmFtLm9yaWdpbmFsRW5kP1xuXHRcdFx0XHRAb3JpZ2luYWxFbmRUaW1lID0gQF9pbml0RGlhZ3JhbS5vcmlnaW5hbEVuZFxuXHRcdFx0aWYgQF9pbml0RGlhZ3JhbS50aW1lU2NhbGU/XG5cdFx0XHRcdEB0aW1lU2NhbGUgPSBAX2luaXREaWFncmFtLnRpbWVTY2FsZVxuXHRcdFx0aWYgQF9pbml0RGlhZ3JhbS50aW1lU2NhbGVVbml0P1xuXHRcdFx0XHRAdGltZVNjYWxlID0gQF9pbml0RGlhZ3JhbS50aW1lU2NhbGVVbml0XG5cdFx0XHRpZiBAX2luaXREaWFncmFtLnRpbWVVbml0P1xuXHRcdFx0XHRAdGltZVVuaXQgPSBAX2luaXREaWFncmFtLnRpbWVVbml0XG5cdFx0XHRpZiBAX2luaXREaWFncmFtLmN1cnNvcj8gYW5kIEBfaW5pdERpYWdyYW0uY3Vyc29yRXhhY3Q/XG5cdFx0XHRcdEBjdXJyZW50VGltZSA9IEBfaW5pdERpYWdyYW0uY3Vyc29yXG5cdFx0XHRcdEBjdXJyZW50RXhhY3RUaW1lID0gQF9pbml0RGlhZ3JhbS5jdXJzb3JFeGFjdFxuXG5cdFx0Zm9yIHNpZ25hbCBpbiBAc2lnbmFsc1xuXHRcdFx0c2lnbmFsLm9yaWdpbmFsTmFtZSA9IHNpZ25hbC5uYW1lXG5cdFx0dW5sZXNzIEBfaW5pdERpYWdyYW0/XG5cdFx0XHRAcmVuZGVyZWRTaWduYWxzID0gW11cblx0XHRcdEByZW1vdmVkU2lnbmFscyA9IFtdXG5cdFx0XHRAaW5jbHVkZWRTaWduYWxzID0gW11cblx0XHRcdEBleGNsdWRlZFNpZ25hbHMgPSBbXVxuXHRcdFx0Zm9yIHNpZ25hbCBpbiBAc2lnbmFsc1xuXHRcdFx0XHRjb250aW51ZSB1bmxlc3MgdHlwZW9mIHNpZ25hbC5uYW1lIGlzICdzdHJpbmcnIG9yIHNpZ25hbC5uYW1lLnRyaW0oKSBpcyAnJ1xuXHRcdFx0XHRsZXZlbHMgPSBzaWduYWwubmFtZS5zcGxpdCAnLidcblx0XHRcdFx0ZGVwdGggPSBsZXZlbHMubGVuZ3RoXG5cdFx0XHRcdHNpZ25hbElkID0gc2lnbmFsLm5hbWVcblx0XHRcdFx0aWYgZGVwdGggPiAxXG5cdFx0XHRcdFx0bGV2ZWxzLnNwbGljZSAwLCAxXG5cdFx0XHRcdHNpZ25hbC5uYW1lID0gbGV2ZWxzLmpvaW4gJy4nXG5cdFx0XHRcdGJ1c1NpZ25hbCA9IEBpc0J1cyBzaWduYWwubmFtZVxuXHRcdFx0XHRpZiBkZXB0aCBpcyAyXG5cdFx0XHRcdFx0dW5sZXNzIHNpZ25hbElkIGluIEBpbmNsdWRlZFNpZ25hbHNcblx0XHRcdFx0XHRcdEByZW5kZXJlZFNpZ25hbHMucHVzaFxuXHRcdFx0XHRcdFx0XHRpZDogc2lnbmFsSWRcblx0XHRcdFx0XHRcdFx0c2lnbmFsOiBzaWduYWxcblx0XHRcdFx0XHRcdFx0dGV4dDogbnVsbFxuXHRcdFx0XHRcdFx0XHR5cG9zOiBudWxsXG5cdFx0XHRcdFx0XHRcdGN1cnJlbnRWYWx1ZTogJzAnXG5cdFx0XHRcdFx0XHRcdHR5cGU6IGlmIGJ1c1NpZ25hbCB0aGVuIEJVU19TSUdOQUwgZWxzZSBXSVJFX1NJR05BTFxuXHRcdFx0XHRcdFx0XHR3aWR0aDogaWYgYnVzU2lnbmFsIHRoZW4gTWF0aC5hYnMoYnVzU2lnbmFsLnN0YXJ0IC0gYnVzU2lnbmFsLmVuZCkgKyAxIGVsc2UgMVxuXHRcdFx0XHRcdFx0QGluY2x1ZGVkU2lnbmFscy5wdXNoIHNpZ25hbElkXG5cdFx0XHRcdGVsc2UgaWYgZGVwdGggPiAyXG5cdFx0XHRcdFx0dW5sZXNzIHNpZ25hbElkIGluIEBleGNsdWRlZFNpZ25hbHNcblx0XHRcdFx0XHRcdEByZW1vdmVkU2lnbmFscy5wdXNoXG5cdFx0XHRcdFx0XHRcdGlkOiBzaWduYWxJZFxuXHRcdFx0XHRcdFx0XHRzaWduYWw6IHNpZ25hbFxuXHRcdFx0XHRcdFx0XHR0ZXh0OiBudWxsXG5cdFx0XHRcdFx0XHRcdHlwb3M6IG51bGxcblx0XHRcdFx0XHRcdFx0Y3VycmVudFZhbHVlOiAnMCdcblx0XHRcdFx0XHRcdFx0dHlwZTogaWYgYnVzU2lnbmFsIHRoZW4gQlVTX1NJR05BTCBlbHNlIFdJUkVfU0lHTkFMXG5cdFx0XHRcdFx0XHRcdHdpZHRoOiBpZiBidXNTaWduYWwgdGhlbiBNYXRoLmFicyhidXNTaWduYWwuc3RhcnQgLSBidXNTaWduYWwuZW5kKSArIDEgZWxzZSAxXG5cdFx0XHRcdFx0XHRAZXhjbHVkZWRTaWduYWxzLnB1c2ggc2lnbmFsSWRcblx0XHRlbHNlXG5cdFx0XHRzaWduYWxNYXAgPSB7fVxuXHRcdFx0QHJlbmRlcmVkU2lnbmFscyA9IFtdXG5cdFx0XHRAcmVtb3ZlZFNpZ25hbHMgPSBbXVxuXHRcdFx0QGluY2x1ZGVkU2lnbmFscyA9IFtdXG5cdFx0XHRAZXhjbHVkZWRTaWduYWxzID0gW11cblx0XHRcdGZvciBpbmRleCBpbiBAX2luaXREaWFncmFtLnJlbmRlcmVkXG5cdFx0XHRcdEBpbmNsdWRlZFNpZ25hbHMucHVzaCBpbmRleCB1bmxlc3MgaW5kZXggaW4gQGluY2x1ZGVkU2lnbmFsc1xuXHRcdFx0Zm9yIGluZGV4IGluIEBfaW5pdERpYWdyYW0uaGlkZGVuXG5cdFx0XHRcdEBleGNsdWRlZFNpZ25hbHMucHVzaCBpbmRleCB1bmxlc3MgaW5kZXggaW4gQGV4Y2x1ZGVkU2lnbmFsc1xuXHRcdFx0QF9pbml0RGlhZ3JhbS5yZW5kZXJlZCA9IChpbmRleCBmb3IgaW5kZXggaW4gQGluY2x1ZGVkU2lnbmFscylcblx0XHRcdEBfaW5pdERpYWdyYW0uaGlkZGVuID0gKGluZGV4IGZvciBpbmRleCBpbiBAZXhjbHVkZWRTaWduYWxzKVxuXG5cdFx0XHRmb3Igc2lnbmFsIGluIEBzaWduYWxzXG5cdFx0XHRcdGNvbnRpbnVlIHVubGVzcyB0eXBlb2Ygc2lnbmFsLm5hbWUgaXMgJ3N0cmluZycgb3Igc2lnbmFsLm5hbWUudHJpbSgpIGlzICcnXG5cdFx0XHRcdGxldmVscyA9IHNpZ25hbC5uYW1lLnNwbGl0ICcuJ1xuXHRcdFx0XHRkZXB0aCA9IGxldmVscy5sZW5ndGhcblx0XHRcdFx0c2lnbmFsSWQgPSBzaWduYWwubmFtZVxuXHRcdFx0XHRpZiBkZXB0aCA+IDFcblx0XHRcdFx0XHRsZXZlbHMuc3BsaWNlIDAsIDFcblx0XHRcdFx0c2lnbmFsLm5hbWUgPSBsZXZlbHMuam9pbiAnLidcblx0XHRcdFx0YnVzU2lnbmFsID0gQGlzQnVzIHNpZ25hbC5uYW1lXG5cdFx0XHRcdHNpZ25hbE1hcFtzaWduYWxJZF0gPVxuXHRcdFx0XHRcdFx0XHRpZDogc2lnbmFsSWRcblx0XHRcdFx0XHRcdFx0c2lnbmFsOiBzaWduYWxcblx0XHRcdFx0XHRcdFx0dGV4dDogbnVsbFxuXHRcdFx0XHRcdFx0XHR5cG9zOiBudWxsXG5cdFx0XHRcdFx0XHRcdGN1cnJlbnRWYWx1ZTogJzAnXG5cdFx0XHRcdFx0XHRcdHR5cGU6IGlmIGJ1c1NpZ25hbCB0aGVuIEJVU19TSUdOQUwgZWxzZSBXSVJFX1NJR05BTFxuXHRcdFx0XHRcdFx0XHR3aWR0aDogaWYgYnVzU2lnbmFsIHRoZW4gTWF0aC5hYnMoYnVzU2lnbmFsLnN0YXJ0IC0gYnVzU2lnbmFsLmVuZCkgKyAxIGVsc2UgMVxuXHRcdFx0QHJlbmRlcmVkU2lnbmFscy5wdXNoIHNpZ25hbE1hcFtzaWduYWxJbmRleF0gZm9yIHNpZ25hbEluZGV4IGluIEBfaW5pdERpYWdyYW0ucmVuZGVyZWRcblx0XHRcdEByZW1vdmVkU2lnbmFscy5wdXNoIHNpZ25hbE1hcFtzaWduYWxJbmRleF0gZm9yIHNpZ25hbEluZGV4IGluIEBfaW5pdERpYWdyYW0uaGlkZGVuXG5cdFx0XHRpZiB0eXBlb2YgQF9pbml0RGlhZ3JhbS5oaWdobGlnaHRlZEluZGV4IGlzICdudW1iZXInIGFuZCBAX2luaXREaWFncmFtLmhpZ2hsaWdodGVkSW5kZXggPCBAcmVuZGVyZWRTaWduYWxzLmxlbmd0aFxuXHRcdFx0XHRAaGlnaGxpZ2h0ZWRJbmRleCA9IEBfaW5pdERpYWdyYW0uaGlnaGxpZ2h0ZWRJbmRleFxuXG5cblx0XHRAX2luaXRMYXlvdXQoKVxuXHRcdEBfaW5pdENhbnZhcygpXG5cdFx0QHJlZHJhdygpXG5cdFx0aWYgQF9pbml0RGlhZ3JhbT8gYW5kIEBfaW5pdERpYWdyYW0uY3Vyc29yPyBhbmQgQF9pbml0RGlhZ3JhbS5jdXJzb3JFeGFjdD9cblx0XHRcdEBzZXRDdXJzb3JUaW1lIEBjdXJyZW50RXhhY3RUaW1lXG5cdFx0aWYgQF9pbml0RGlhZ3JhbT8gYW5kIEBfaW5pdERpYWdyYW0ucmFkaXg/XG5cdFx0XHRpZiBAX2luaXREaWFncmFtLnJhZGl4IGlzIFJBRElYX0JJTlxuXHRcdFx0XHQkKFwiIyN7QF9yYWRpeFNlbGVjdElkfVwiKS52YWwoXCIje0BfcmFkaXhTZWxlY3RCaW5JZH1cIikuc2VsZWN0bWVudSgncmVmcmVzaCcpXG5cdFx0XHRcdEByYWRpeCA9IFJBRElYX0JJTlxuXHRcdFx0XHRAc2V0UmFkaXggUkFESVhfQklOXG5cdFx0XHRlbHNlIGlmIEBfaW5pdERpYWdyYW0ucmFkaXggaXMgUkFESVhfSEVYXG5cdFx0XHRcdCQoXCIjI3tAX3JhZGl4U2VsZWN0SWR9XCIpLnZhbChcIiN7QF9yYWRpeFNlbGVjdEhleElkfVwiKS5zZWxlY3RtZW51KCdyZWZyZXNoJylcblx0XHRcdFx0QHJhZGl4ID0gUkFESVhfSEVYXG5cdFx0XHRcdEBzZXRSYWRpeCBSQURJWF9IRVhcblx0XHRcdGVsc2UgaWYgQF9pbml0RGlhZ3JhbS5yYWRpeCBpcyBSQURJWF9ERUNcblx0XHRcdFx0JChcIiMje0BfcmFkaXhTZWxlY3RJZH1cIikudmFsKFwiI3tAX3JhZGl4U2VsZWN0RGVjSWR9XCIpLnNlbGVjdG1lbnUoJ3JlZnJlc2gnKVxuXHRcdFx0XHRAcmFkaXggPSBSQURJWF9ERUNcblx0XHRcdFx0QHNldFJhZGl4IFJBRElYX0RFQ1xuXHRcdFx0QHJlZHJhdygpXG5cblx0c2V0T25DaGFuZ2VMaXN0ZW5lcjogKGxpc3RlbmVyKSAtPlxuXHRcdGlmIHR5cGVvZiBsaXN0ZW5lciBpcyAnZnVuY3Rpb24nXG5cdFx0XHRAX29uQ2hhbmdlTGlzdGVuZXIgPSBsaXN0ZW5lclxuXG5cdHNldE9uU2F2ZUxpc3RlbmVyOiAobGlzdGVuZXIpIC0+XG5cdFx0aWYgdHlwZW9mIGxpc3RlbmVyIGlzICdmdW5jdGlvbidcblx0XHRcdEBfb25TYXZlTGlzdGVuZXIgPSBsaXN0ZW5lclxuXG5cdGV4cG9ydFRpbWluZ0RpYWdyYW06IC0+XG5cdFx0cmVuZGVyZWRPcmRlciA9XG5cdFx0XHQoZm9yIHNpZ25hbCBpbiBAcmVuZGVyZWRTaWduYWxzXG5cdFx0XHRcdHNpZ25hbC5pZClcblx0XHRoaWRkZW5PcmRlciA9XG5cdFx0XHQoZm9yIHNpZ25hbCBpbiBAcmVtb3ZlZFNpZ25hbHNcblx0XHRcdFx0c2lnbmFsLmlkKVxuXHRcdGV4cG9ydGVkID1cblx0XHRcdHJlbmRlcmVkOiByZW5kZXJlZE9yZGVyXG5cdFx0XHRoaWRkZW46IGhpZGRlbk9yZGVyXG5cdFx0XHRmcm9tOiBAcmVuZGVyRnJvbVxuXHRcdFx0dG86IEByZW5kZXJUb1xuXHRcdFx0Y3Vyc29yOiBAY3VycmVudFRpbWVcblx0XHRcdGN1cnNvckV4YWN0OiBAY3VycmVudEV4YWN0VGltZVxuXHRcdFx0ZW5kOiBAZW5kVGltZVxuXHRcdFx0b3JpZ2luYWxFbmQ6IEBvcmlnaW5hbEVuZFRpbWVcblx0XHRcdHJhZGl4OiBAcmFkaXhcblx0XHRcdHRpbWVTY2FsZTogQHRpbWVTY2FsZVxuXHRcdFx0dGltZVNjYWxlVW5pdDogQHRpbWVTY2FsZVVuaXRcblx0XHRcdHRpbWVVbml0OiBAdGltZVVuaXRcblx0XHRcdGhpZ2hsaWdodGVkSW5kZXg6IEBoaWdobGlnaHRlZEluZGV4XG5cdFx0SlNPTi5zdHJpbmdpZnkgZXhwb3J0ZWRcblxuXHRyZXNldFRpbWluZ0RpYWdyYW06IC0+XG5cdFx0QHRpbWVTY2FsZSA9IEBfZGF0YS5zY2FsZS5tYXRjaCAvKFxcZCspL1xuXHRcdEB0aW1lU2NhbGVVbml0ID0gQF9kYXRhLnNjYWxlLm1hdGNoIC8oXFxEKykvXG5cdFx0cmV0dXJuIG51bGwgaWYgbm90IEB0aW1lU2NhbGU/IG9yIG5vdCBAdGltZVNjYWxlVW5pdFxuXHRcdEB0aW1lU2NhbGUgPSBAdGltZVNjYWxlWzBdXG5cdFx0QHRpbWVTY2FsZVVuaXQgPSBAdGltZVNjYWxlVW5pdFswXVxuXHRcdEB0aW1lVW5pdCA9IHBhcnNlSW50IEB0aW1lU2NhbGVcblx0XHRpZiBAdGltZVNjYWxlVW5pdCBpcyAnbnMnXG5cdFx0XHRAdGltZVVuaXQgKj0gMTAwMFxuXG5cdFx0QHJhZGl4ID0gUkFESVhfQklOXG5cblx0XHRAb3JpZ2luYWxFbmRUaW1lID0gQF9kYXRhLmVuZHRpbWVcblx0XHRAZW5kVGltZSA9IEBjZWlsRml2ZSBAb3JpZ2luYWxFbmRUaW1lXG5cdFx0QHJlbmRlckZyb20gPSAwXG5cdFx0aWYgQG9yaWdpbmFsRW5kVGltZSA+IDEwMFxuXHRcdFx0QHJlbmRlclRvID0gQGZsb29ySW50IEBlbmRUaW1lLCAxMDBcblx0XHRlbHNlXG5cdFx0XHRAcmVuZGVyVG8gPSBAcm91bmRJbnQgKEBlbmRUaW1lIC8gMi4wKSwgMTBcblxuXHRcdGZvciBzaWduYWwgaW4gQHNpZ25hbHNcblx0XHRcdHNpZ25hbC5uYW1lID0gc2lnbmFsLm9yaWdpbmFsTmFtZVxuXG5cdFx0QF9kYXRhLnNpZ25hbC5zb3J0IChmaXJzdFNpZ25hbCwgc2Vjb25kU2lnbmFsKSAtPlxuXHRcdFx0aWYgZmlyc3RTaWduYWwubmFtZSA8IHNlY29uZFNpZ25hbC5uYW1lXG5cdFx0XHRcdC0xXG5cdFx0XHRlbHNlIGlmIGZpcnN0U2lnbmFsLm5hbWUgPiBzZWNvbmRTaWduYWwubmFtZVxuXHRcdFx0XHQxXG5cdFx0XHRlbHNlXG5cdFx0XHRcdDBcblxuXHRcdEBzaWduYWxzID0gQF9kYXRhLnNpZ25hbFxuXG5cdFx0QHJlbmRlcmVkU2lnbmFscyA9IFtdXG5cdFx0QHJlbW92ZWRTaWduYWxzID0gW11cblx0XHRAaW5jbHVkZWRTaWduYWxzID0gW11cblx0XHRAZXhjbHVkZWRTaWduYWxzID0gW11cblx0XHRmb3Igc2lnbmFsIGluIEBzaWduYWxzXG5cdFx0XHRjb250aW51ZSB1bmxlc3MgdHlwZW9mIHNpZ25hbC5uYW1lIGlzICdzdHJpbmcnIG9yIHNpZ25hbC5uYW1lLnRyaW0oKSBpcyAnJ1xuXHRcdFx0bGV2ZWxzID0gc2lnbmFsLm5hbWUuc3BsaXQgJy4nXG5cdFx0XHRkZXB0aCA9IGxldmVscy5sZW5ndGhcblx0XHRcdHNpZ25hbElkID0gc2lnbmFsLm5hbWVcblx0XHRcdGlmIGRlcHRoID4gMVxuXHRcdFx0XHRsZXZlbHMuc3BsaWNlIDAsIDFcblx0XHRcdHNpZ25hbC5uYW1lID0gbGV2ZWxzLmpvaW4gJy4nXG5cdFx0XHRidXNTaWduYWwgPSBAaXNCdXMgc2lnbmFsLm5hbWVcblx0XHRcdGlmIGRlcHRoIGlzIDJcblx0XHRcdFx0dW5sZXNzIHNpZ25hbElkIGluIEBpbmNsdWRlZFNpZ25hbHNcblx0XHRcdFx0XHRAcmVuZGVyZWRTaWduYWxzLnB1c2hcblx0XHRcdFx0XHRcdGlkOiBzaWduYWxJZFxuXHRcdFx0XHRcdFx0c2lnbmFsOiBzaWduYWxcblx0XHRcdFx0XHRcdHRleHQ6IG51bGxcblx0XHRcdFx0XHRcdHlwb3M6IG51bGxcblx0XHRcdFx0XHRcdGN1cnJlbnRWYWx1ZTogJzAnXG5cdFx0XHRcdFx0XHR0eXBlOiBpZiBidXNTaWduYWwgdGhlbiBCVVNfU0lHTkFMIGVsc2UgV0lSRV9TSUdOQUxcblx0XHRcdFx0XHRcdHdpZHRoOiBpZiBidXNTaWduYWwgdGhlbiBNYXRoLmFicyhidXNTaWduYWwuc3RhcnQgLSBidXNTaWduYWwuZW5kKSArIDEgZWxzZSAxXG5cdFx0XHRcdFx0QGluY2x1ZGVkU2lnbmFscy5wdXNoIHNpZ25hbElkXG5cdFx0XHRlbHNlIGlmIGRlcHRoID4gMlxuXHRcdFx0XHR1bmxlc3Mgc2lnbmFsSWQgaW4gQGV4Y2x1ZGVkU2lnbmFsc1xuXHRcdFx0XHRcdEByZW1vdmVkU2lnbmFscy5wdXNoXG5cdFx0XHRcdFx0XHRpZDogc2lnbmFsSWRcblx0XHRcdFx0XHRcdHNpZ25hbDogc2lnbmFsXG5cdFx0XHRcdFx0XHR0ZXh0OiBudWxsXG5cdFx0XHRcdFx0XHR5cG9zOiBudWxsXG5cdFx0XHRcdFx0XHRjdXJyZW50VmFsdWU6ICcwJ1xuXHRcdFx0XHRcdFx0dHlwZTogaWYgYnVzU2lnbmFsIHRoZW4gQlVTX1NJR05BTCBlbHNlIFdJUkVfU0lHTkFMXG5cdFx0XHRcdFx0XHR3aWR0aDogaWYgYnVzU2lnbmFsIHRoZW4gTWF0aC5hYnMoYnVzU2lnbmFsLnN0YXJ0IC0gYnVzU2lnbmFsLmVuZCkgKyAxIGVsc2UgMVxuXHRcdFx0XHRcdEBleGNsdWRlZFNpZ25hbHMucHVzaCBzaWduYWxJZFxuXG5cblx0XHRAY3VycmVudFRpbWUgPSB1bmRlZmluZWRcblx0XHRAY3VycmVudEV4YWN0VGltZSA9IHVuZGVmaW5lZFxuXG5cdFx0QGhpZ2hsaWdodGVkSW5kZXggPSB1bmRlZmluZWRcblxuXHRcdEByZWRyYXcoKVxuXHRcdGlmIEBfY3Vyc29yXG5cdFx0XHRAX2N1cnNvci5zZXRWaXNpYmxlIG5vXG5cdFx0XHRAX2N1cnNvci50aW1lID0gdW5kZWZpbmVkXG5cblx0XHRcdEByZWZyZXNoQ3VycmVudFZhbHVlcygpXG5cdFx0XHRAX2N1cnNvclZhbHVlRGl2LnRleHQgJydcblxuXHRcdCQoXCIjI3tAX3JhZGl4U2VsZWN0SWR9XCIpLnZhbChcIiN7QF9yYWRpeFNlbGVjdEJpbklkfVwiKS5zZWxlY3RtZW51KCdyZWZyZXNoJylcblx0XHRAc2V0UmFkaXggUkFESVhfQklOXG5cblx0XHRpZiBAX29uQ2hhbmdlTGlzdGVuZXJcblx0XHRcdEBfb25DaGFuZ2VMaXN0ZW5lclxuXHRcdFx0XHRcdFx0dHlwZTogJ3Jlc2V0J1xuXG5cdHJlZHJhdzogLT5cblx0XHRpZiBAcmVuZGVyVG8gPiBAZW5kVGltZVxuXHRcdFx0QHJlbmRlclRvID0gQGVuZFRpbWVcblx0XHRAY2xlYXJDYW52YXMoKVxuXHRcdEBkcmF3R3JpZChAcmVuZGVyRnJvbSwgQHJlbmRlclRvKVxuXHRcdEBkcmF3U2lnbmFscyhAcmVuZGVyRnJvbSwgQHJlbmRlclRvKVxuXHRcdGlmIEBfY3Vyc29yXG5cdFx0XHRAX2NhbnZhcy5hZGQgQF9jdXJzb3Jcblx0XHRpZiBAaGlnaGxpZ2h0ZWRcblx0XHRcdEBoaWdobGlnaHRlZC5maWxsID0gdW5kZWZpbmVkXG5cdFx0XHRAaGlnaGxpZ2h0ZWQub3BhY2l0eSA9IDBcblx0XHRpZiBAaGlnaGxpZ2h0ZWRJbmRleFxuXHRcdFx0QGhpZ2hsaWdodGVkID0gQHJlbmRlcmVkU2lnbmFsc1tAaGlnaGxpZ2h0ZWRJbmRleF0uaGlnaGxpZ2h0XG5cdFx0XHRAaGlnaGxpZ2h0ZWQuZmlsbCA9IERFRkFVTFRfQ09MT1IuU0lHTkFMX0hJR0hMSUdIVFxuXHRcdFx0QGhpZ2hsaWdodGVkLm9wYWNpdHkgPSBERUZBVUxUX09QQUNJVFkuU0lHTkFMX0hJR0hMSUdIVFxuXHRcdEBzZXRDdXJzb3JUaW1lIEBjdXJyZW50RXhhY3RUaW1lXG5cblx0c2V0Q3Vyc29yVGltZTogKGV4YWN0VGltZSkgLT5cblx0XHRyZXR1cm4gdW5sZXNzIGV4YWN0VGltZT9cblx0XHR0aW1lID0gZXhhY3RUaW1lLnRvRml4ZWQoMilcblx0XHRjdXJzb3JQb3MgPSBAX3RpbWVUb1BvcyBleGFjdFRpbWUsIG51bGwsIG5vXG5cblx0XHRAY3VycmVudFRpbWUgPSB0aW1lXG5cdFx0QGN1cnJlbnRFeGFjdFRpbWUgPSBleGFjdFRpbWVcblxuXHRcdGlmIEBfY3Vyc29yP1xuXHRcdFx0QF9jdXJzb3IueDEgPSBjdXJzb3JQb3Ncblx0XHRcdEBfY3Vyc29yLngyID0gY3Vyc29yUG9zXG5cdFx0XHRAX2N1cnNvci5zZXRMZWZ0IGN1cnNvclBvc1xuXHRcdFx0QF9jdXJzb3Iuc2V0VG9wIDBcblx0XHRcdEBfY3Vyc29yLnNldEhlaWdodCBAY2FudmFzSGVpZ2h0XG5cdFx0XHRAX2N1cnNvci53aWR0aCA9IDFcblx0XHRlbHNlXG5cdFx0XHRAX2N1cnNvciA9IG5ldyBmYWJyaWMuTGluZSBbY3Vyc29yUG9zLCAwLCBjdXJzb3JQb3MsIEBjYW52YXNIZWlnaHRdLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRmaWxsOiBERUZBVUxUX0NPTE9SLkNVUlNPUlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzdHJva2U6IERFRkFVTFRfQ09MT1IuQ1VSU09SXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHN0cm9rZVdpZHRoOiAxXG5cdFx0XHRcdFx0XHRcdFx0XHRcdG9wYWNpdHk6IERFRkFVTFRfT1BBQ0lUWS5DVVJTT1Jcblx0XHRcdFx0XHRcdFx0XHRcdFx0c2VsZWN0YWJsZTogbm9cblx0XHRcdFx0XHRcdFx0XHRcdFx0aGFzQ29udHJvbHM6IG5vXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGhhc1JvdGF0aW5nUG9pbnQ6IG5vXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHdpZHRoOiAxXG5cdFx0XHRAX2N1cnNvclZhbHVlRGl2LnNob3coKVxuXHRcdGlmIHRpbWUgPCBAcmVuZGVyRnJvbSBvciB0aW1lID4gQHJlbmRlclRvXG5cdFx0XHRAX2N1cnNvci5zZXRWaXNpYmxlIG5vXG5cdFx0ZWxzZVxuXHRcdFx0QF9jdXJzb3Iuc2V0VmlzaWJsZSB5ZXNcblxuXHRcdHVubGVzcyBAX2NhbnZhcy5jb250YWlucyBAX2N1cnNvclxuXHRcdFx0QF9jYW52YXMuYWRkIEBfY3Vyc29yXG5cdFx0QF9jdXJzb3IudGltZSA9IEBjdXJyZW50VGltZVxuXG5cdFx0QHJlZnJlc2hDdXJyZW50VmFsdWVzKClcblx0XHRjdXJzb3JDdXJyZW50VmFsdWVUZXh0ID0gJ1RpbWU6ICcgKyBAY3VycmVudFRpbWUgKyBAdGltZVNjYWxlVW5pdFxuXHRcdGlmIEBoaWdobGlnaHRlZFxuXHRcdFx0Y3Vyc29yQ3VycmVudFZhbHVlVGV4dCA9IGN1cnNvckN1cnJlbnRWYWx1ZVRleHQgKyAnLCBWYWx1ZTogJyArIEBfZ2V0Rm9ybWF0dGVkVmFsdWUoQGhpZ2hsaWdodGVkLnNpZ25hbC5jdXJyZW50VmFsdWUsIEBoaWdobGlnaHRlZC5zaWduYWwud2lkdGgpXG5cdFx0QF9jdXJzb3JWYWx1ZURpdi50ZXh0IGN1cnNvckN1cnJlbnRWYWx1ZVRleHRcblx0XHRpZiBAX29uQ2hhbmdlTGlzdGVuZXJcblx0XHRcdEBfb25DaGFuZ2VMaXN0ZW5lclxuXHRcdFx0XHRcdFx0dHlwZTogJ2N1cnNvcidcblx0XHRAX2NhbnZhcy5yZW5kZXJBbGwoKVxuXG5cblx0ZHJhd0dyaWQ6IChzdGFydCA9IEByZW5kZXJGcm9tLCBlbmQgPSBAcmVuZGVyVG8pLT5cblx0XHRAX3NpZ25hbHNOYW1lc1JlY3QgPSBuZXcgZmFicmljLlJlY3Rcblx0XHRcdHdpZHRoOiBTSUdOQUxfTkFNRVNfQk9YX1dJRFRIXG5cdFx0XHRoZWlnaHQ6IEBfY2FudmFzLmhlaWdodFxuXHRcdFx0ZmlsbDogREVGQVVMVF9DT0xPUi5TSUdOQUxfTkFNRV9SRUNUXG5cdFx0XHRvcGFjaXR5OiBERUZBVUxUX09QQUNJVFkuU0lHTkFMX05BTUVfUkVDVFxuXG5cblx0XHRAX3JlbmRlckRpc3QgPSBNYXRoLmFicyBAcmVuZGVyVG8gLSBAcmVuZGVyRnJvbVxuXHRcdGxpbmVTdGVwID0gTWF0aC5mbG9vcihAX3JlbmRlckRpc3QgLyAoR1JJRF9TRUNUSU9OUyAtIDEpKVxuXG5cdFx0aSA9IEByZW5kZXJGcm9tICsgbGluZVN0ZXBcblx0XHR3aGlsZSBpIDw9IEByZW5kZXJUb1xuXHRcdFx0aSArPSBsaW5lU3RlcFxuXHRcdGN1cnJlbnRUYXJnZXQgPSBpIC0gbGluZVN0ZXBcblxuXHRcdGkgPSBAcmVuZGVyRnJvbSArIGxpbmVTdGVwXG5cdFx0QF9yZW5kZXJEaXN0YW5jZUZhY3RvciA9IChAX2NhbnZhcy53aWR0aCAtIFNJR05BTF9OQU1FU19CT1hfV0lEVEgpIC8gQF9yZW5kZXJEaXN0XG5cblx0XHRAX2dyaWRMaW5lcyA9IFtdXG5cdFx0QF9ncmlkVGV4dHMgPSBbXVxuXHRcdHdoaWxlIGkgPD0gY3VycmVudFRhcmdldFxuXHRcdFx0bGluZVBvcyA9IEBfdGltZVRvUG9zKGkpXG5cdFx0XHRsaW5lQ29yZHMgPSBbbGluZVBvcywgUlVMRVJfSEVJR0hULCBsaW5lUG9zLCBAX2NhbnZhcy5oZWlnaHRdXG5cdFx0XHRAX2dyaWRMaW5lcy5wdXNoIEBfZ2V0R3JpZExpbmUgbGluZUNvcmRzXG5cdFx0XHRAX2dyaWRUZXh0cy5wdXNoIG5ldyBmYWJyaWMuVGV4dCBpICsgQHRpbWVTY2FsZVVuaXQsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRmb250RmFtaWx5OiAnbW9ub3NwYWNlJ1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0bGVmdDogbGluZVBvcyAtIDEwXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0b3A6IDBcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGZvbnRTaXplOiAxMVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0c2VsZWN0YWJsZTogbm9cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGhhc0NvbnRyb2xzOiBub1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0aGFzUm90YXRpbmdQb2ludDogbm9cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGZpbGw6IERFRkFVTFRfQ09MT1IuR1JJRF9URVhUXG5cdFx0XHRpICs9IGxpbmVTdGVwXG5cblx0XHRmb3IgbGluZSBpbiBAX2dyaWRMaW5lc1xuXHRcdFx0QF9jYW52YXMuYWRkIGxpbmVcblx0XHRmb3IgdGV4dCBpbiBAX2dyaWRUZXh0c1xuXHRcdFx0QF9jYW52YXMuYWRkIHRleHRcblxuXG5cdHJlZnJlc2hTaWduYWxWYWx1ZXM6IC0+XG5cdFx0Zm9yIHZhbCBpbiBAX3NpZ25hbFZhbHVlVGV4dFxuXHRcdFx0dmFsLnRleHRib3guc2V0VGV4dCBAX2dldEZvcm1hdHRlZFZhbHVlIHZhbC52YWx1ZSwgdmFsLndpZHRoXG5cdFx0QF9jYW52YXMucmVuZGVyQWxsKClcblxuXHRkcmF3U2lnbmFsczogKHN0YXJ0ID0gQHJlbmRlckZyb20sIGVuZCA9IEByZW5kZXJUbykgLT5cblx0XHRAX2RyYXdTaWduYWxOYW1lcygpXG5cdFx0c2lnbmFsSW5kZXggPSAtMVxuXHRcdEBfc2lnbmFsVmFsdWVUZXh0ID0gW11cblx0XHRmb3IgcmVuZGVyZWQgaW4gQHJlbmRlcmVkU2lnbmFsc1xuXHRcdFx0c2lnbmFsSW5kZXgrK1xuXHRcdFx0c2lnbmFsID0gcmVuZGVyZWQuc2lnbmFsXG5cdFx0XHRyYW5nZXMgPSBAX2dldFNpZ25hbFZhbHVlcyhzaWduYWwud2F2ZSwgc3RhcnQsIGVuZClcblxuXHRcdFx0c2lnbmFsQnVzID0gQGlzQnVzIHNpZ25hbC5uYW1lXG5cblxuXHRcdFx0aW5pdGlhbFZhbHVlID0gcmFuZ2VzWzBdLnZhbHVlXG5cblx0XHRcdG9yaWdpblggPSBTSUdOQUxfTkFNRVNfQk9YX1dJRFRIXG5cdFx0XHRvcmlnaW5ZID0gcmVuZGVyZWQueXBvc1xuXHRcdFx0aWYgaW5pdGlhbFZhbHVlIGlzICcwJyBvciBpbml0aWFsVmFsdWUgaXMgJ3gnIG9yIGluaXRpYWxWYWx1ZSBpcyAneidcblx0XHRcdFx0b3JpZ2luWSArPSBTSUdOQUxfSEVJR0hUXG5cblx0XHRcdGlmIHNpZ25hbEJ1c1xuXHRcdFx0XHRvcmlnaW5ZID0gcmVuZGVyZWQueXBvcyArIFNJR05BTF9IRUlHSFQgLyAyLjBcblxuXHRcdFx0dmFsdWVJbmRleCA9IDBcblxuXHRcdFx0Zm9yIHZhbHVlT2JqZWN0IGluIHJhbmdlc1xuXHRcdFx0XHR2YWx1ZU9iamVjdC53aWR0aCA9IHJlbmRlcmVkLndpZHRoXG5cdFx0XHRcdGlmIHZhbHVlSW5kZXggaXMgcmFuZ2VzLmxlbmd0aCAtIDFcblx0XHRcdFx0XHR2YWx1ZU9iamVjdC5sYXN0ID0geWVzXG5cdFx0XHRcdFtvcmlnaW5YLCBvcmlnaW5ZLCBpbml0aWFsVmFsdWVdID0gQF9kcmF3VmFsdWUgdmFsdWVPYmplY3QsIG9yaWdpblgsIG9yaWdpblksIGluaXRpYWxWYWx1ZSwgREVGQVVMVF9DT0xPUi5TSUdOQUwsIChzaWduYWxCdXMgaXNudCBubylcblx0XHRcdFx0dmFsdWVJbmRleCsrXG5cblx0XHRcdGhpZ2hsaWdodFJlY3QgPSBuZXcgZmFicmljLlJlY3Rcblx0XHRcdFx0XHRcdFx0XHRcdFx0bGVmdDogMlxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0b3A6IHJlbmRlcmVkLnlwb3MgLSAxXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGhlaWdodDogU0lHTkFMX0hFSUdIVCArIDNcblx0XHRcdFx0XHRcdFx0XHRcdFx0d2lkdGg6IEBjYW52YXNXaWR0aFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRmaWxsOiB1bmRlZmluZWRcblx0XHRcdFx0XHRcdFx0XHRcdFx0b3BhY2l0eTogMFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzZWxlY3RhYmxlOiBub1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRoYXNDb250cm9sczogbm9cblx0XHRcdFx0XHRcdFx0XHRcdFx0aGFzUm90YXRpbmdQb2ludDogbm9cblxuXHRcdFx0aGlnaGxpZ2h0UmVjdC5zaWduYWwgPSByZW5kZXJlZFxuXHRcdFx0cmVuZGVyZWQuaGlnaGxpZ2h0ID0gaGlnaGxpZ2h0UmVjdFxuXHRcdFx0cmVuZGVyZWQuY3VycmVudFZhbHVlID0gcmFuZ2VzWzBdLnZhbHVlXG5cdFx0XHRjdXJyZW50VmFsdWVUZXh0ID0gQF9nZXRGb3JtYXR0ZWRWYWx1ZShyYW5nZXNbMF0udmFsdWUsIHJhbmdlc1swXS53aWR0aClcblx0XHRcdEBfc2lnbmFsQ3VycmVudFZhbHVlc1tzaWduYWxJbmRleF0uc2V0VGV4dCBjdXJyZW50VmFsdWVUZXh0XG5cdFx0XHRjdXJyZW50VmFsdWVXaWR0aCA9IEBfc2lnbmFsQ3VycmVudFZhbHVlc1tzaWduYWxJbmRleF0ud2lkdGhcblx0XHRcdGN1cnJlbnRWYWx1ZVNwYW5XaWR0aCA9IE1hdGguYWJzKFNJR05BTF9OQU1FU19CT1hfV0lEVEggLSBTSUdOQUxfQk9YX1dJRFRIIC0gMTApXG5cdFx0XHRvdmVyZmxvd1dpZHRoID0gY3VycmVudFZhbHVlV2lkdGggPiBjdXJyZW50VmFsdWVTcGFuV2lkdGhcblx0XHRcdHdoaWxlIGN1cnJlbnRWYWx1ZVdpZHRoID4gY3VycmVudFZhbHVlU3BhbldpZHRoXG5cdFx0XHRcdGN1cnJlbnRWYWx1ZVRleHQgPSBjdXJyZW50VmFsdWVUZXh0LnN1YnN0ciAwLCBjdXJyZW50VmFsdWVUZXh0Lmxlbmd0aCAtIDFcblx0XHRcdFx0QF9zaWduYWxDdXJyZW50VmFsdWVzW3NpZ25hbEluZGV4XS5zZXRUZXh0IGN1cnJlbnRWYWx1ZVRleHRcblx0XHRcdFx0Y3VycmVudFZhbHVlV2lkdGggPSBAX3NpZ25hbEN1cnJlbnRWYWx1ZXNbc2lnbmFsSW5kZXhdLndpZHRoXG5cdFx0XHRpZiBvdmVyZmxvd1dpZHRoXG5cdFx0XHRcdGN1cnJlbnRWYWx1ZVdpZHRoID0gY3VycmVudFZhbHVlV2lkdGggKyAnLi4nXG5cdFx0XHRAX2NhbnZhcy5hZGQgQF9zaWduYWxDdXJyZW50VmFsdWVzW3NpZ25hbEluZGV4XVxuXHRcdFx0QF9jYW52YXMuYWRkIGhpZ2hsaWdodFJlY3RcblxuXHRcdEBfY2FudmFzLmJyaW5nVG9Gcm9udCBAX2N1cnJlbnRWYWx1ZUxpbmVTdGFydFxuXHRcdEBfY2FudmFzLmJyaW5nVG9Gcm9udCBAX2N1cnJlbnRWYWx1ZUxpbmVFbmRcblx0XHRAX2NhbnZhcy5yZW5kZXJBbGwoKVxuXG5cdHJlZnJlc2hDdXJyZW50VmFsdWVzOiAtPlxuXHRcdHNpZ25hbEluZGV4ID0gMFxuXHRcdGZvciByZW5kZXJlZCBpbiBAcmVuZGVyZWRTaWduYWxzXG5cdFx0XHRzaWduYWwgPSByZW5kZXJlZC5zaWduYWxcblx0XHRcdHdhdmUgPSBzaWduYWwud2F2ZVxuXHRcdFx0aW5kID0gMFxuXHRcdFx0Zm9yIHZhbHVlIGluIHdhdmVcblx0XHRcdFx0aWYgQGN1cnJlbnRUaW1lID49IE51bWJlci5wYXJzZUludCB2YWx1ZVswXVxuXHRcdFx0XHRcdGlmIGluZCBpcyB3YXZlLmxlbmd0aCAtIDEgb3IgQGN1cnJlbnRUaW1lIDw9IE51bWJlci5wYXJzZUludCB3YXZlW2luZCArIDFdXG5cdFx0XHRcdFx0XHRyZW5kZXJlZC5jdXJyZW50VmFsdWUgPSB2YWx1ZVsxXVxuXHRcdFx0XHRcdFx0YnJlYWtcblx0XHRcdFx0aW5kKytcblx0XHRcdGN1cnJlbnRWYWx1ZVRleHQgPSBAX2dldEZvcm1hdHRlZFZhbHVlKHJlbmRlcmVkLmN1cnJlbnRWYWx1ZSwgcmVuZGVyZWQud2lkdGgpXG5cdFx0XHRAX3NpZ25hbEN1cnJlbnRWYWx1ZXNbc2lnbmFsSW5kZXhdLnNldFRleHQgY3VycmVudFZhbHVlVGV4dFxuXHRcdFx0Y3VycmVudFZhbHVlV2lkdGggPSBAX3NpZ25hbEN1cnJlbnRWYWx1ZXNbc2lnbmFsSW5kZXhdLndpZHRoXG5cdFx0XHRjdXJyZW50VmFsdWVTcGFuV2lkdGggPSBNYXRoLmFicyhTSUdOQUxfTkFNRVNfQk9YX1dJRFRIIC0gU0lHTkFMX0JPWF9XSURUSCAtIDE0KVxuXHRcdFx0b3ZlcmZsb3dXaWR0aCA9IGN1cnJlbnRWYWx1ZVdpZHRoID4gY3VycmVudFZhbHVlU3BhbldpZHRoXG5cdFx0XHR3aGlsZSBjdXJyZW50VmFsdWVXaWR0aCA+IGN1cnJlbnRWYWx1ZVNwYW5XaWR0aFxuXHRcdFx0XHRjdXJyZW50VmFsdWVUZXh0ID0gY3VycmVudFZhbHVlVGV4dC5zdWJzdHIgMCwgY3VycmVudFZhbHVlVGV4dC5sZW5ndGggLSAxXG5cdFx0XHRcdEBfc2lnbmFsQ3VycmVudFZhbHVlc1tzaWduYWxJbmRleF0uc2V0VGV4dCBjdXJyZW50VmFsdWVUZXh0XG5cdFx0XHRcdGN1cnJlbnRWYWx1ZVdpZHRoID0gQF9zaWduYWxDdXJyZW50VmFsdWVzW3NpZ25hbEluZGV4XS53aWR0aFxuXHRcdFx0aWYgb3ZlcmZsb3dXaWR0aFxuXHRcdFx0XHRjdXJyZW50VmFsdWVXaWR0aCA9IGN1cnJlbnRWYWx1ZVdpZHRoICsgJy4uJ1xuXHRcdFx0c2lnbmFsSW5kZXgrK1xuXHRcdEBfY2FudmFzLnJlbmRlckFsbCgpXG5cblxuXHRhZGRTaWduYWw6IC0+XG5cdFx0dGl0bGUgPSBcIkFkZCBTaWduYWxzXCJcblx0XHRjb25zb2xlLmxvZyBAcmVtb3ZlZFNpZ25hbHNcblx0XHRjb25zb2xlLmxvZyBAaW5jbHVkZWRTaWduYWxzXG5cdFx0Y29uc29sZS5sb2cgQGV4Y2x1ZGVkU2lnbmFsc1xuXHRcdEByZW1vdmVkU2lnbmFscy5zb3J0IChmaXJzdFNpZ25hbCwgc2Vjb25kU2lnbmFsKSAtPlxuXHRcdFx0aWYgZmlyc3RTaWduYWwuc2lnbmFsLm5hbWUgPCBzZWNvbmRTaWduYWwuc2lnbmFsLm5hbWVcblx0XHRcdFx0LTFcblx0XHRcdGVsc2UgaWYgZmlyc3RTaWduYWwuc2lnbmFsLm5hbWUgPiBzZWNvbmRTaWduYWwuc2lnbmFsLm5hbWVcblx0XHRcdFx0MVxuXHRcdFx0ZWxzZVxuXHRcdFx0XHQwXG5cblx0XHRzaWduYWxUcmVlID0gW11cblx0XHRpc1NpZ25hbEFkZGVkID0ge31cblx0XHRwYXJlbnQgPSAnJ1xuXHRcdGZvciByZW1vdmVkU2lnbmFsLCBpbmRleCBpbiBAcmVtb3ZlZFNpZ25hbHNcblx0XHRcdHNpbmdhbE5hbWUgPSByZW1vdmVkU2lnbmFsLnNpZ25hbC5uYW1lXG5cdFx0XHRzaWduYWxQYXJ0cyA9IHNpbmdhbE5hbWUuc3BsaXQgJy4nXG5cdFx0XHR0cmVlSXQgPSBzaWduYWxUcmVlLnJvb3Rcblx0XHRcdHBhdGggPSBcIlwiXG5cdFx0XHRpZCA9IHBhdGggPSBwYXJlbnQgPSBcIlwiXG5cdFx0XHRmb3IgcGFydCwgbHZsIGluIHNpZ25hbFBhcnRzXG5cdFx0XHRcdGlmIGx2bCBpcyAwXG5cdFx0XHRcdFx0aWQgPSBwYXRoID0gcGFydFxuXHRcdFx0XHRcdHBhcmVudCA9IFwiI1wiXG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRpZCA9IHBhdGggKyBcIi5cIiArIHBhcnRcblx0XHRcdFx0XHRwYXJlbnQgPSBwYXRoXG5cdFx0XHRcdFx0cGF0aCA9IGlkXG5cdFx0XHRcdHNpZ25hbE9iaiA9XG5cdFx0XHRcdFx0XCJpZFwiOiBpZFxuXHRcdFx0XHRcdFwicGFyZW50XCI6IHBhcmVudFxuXHRcdFx0XHRcdFwidGV4dFwiOiBwYXJ0XG5cdFx0XHRcdFx0ZGF0YTpcblx0XHRcdFx0XHRcdGluZGV4OiBpbmRleFxuXHRcdFx0XHRcdFx0bGV2ZWw6IGx2bFxuXHRcdFx0XHRcdFx0c2lnbmFsSWQ6IHJlbW92ZWRTaWduYWwuaWRcblx0XHRcdFx0XHRcImxpX2F0dHJcIiA6XG5cdFx0XHRcdFx0XHRcImNsYXNzXCI6XCJ0cmVlLWl0ZW0gdHJlZS1maWxlLWl0ZW1cIlxuXHRcdFx0XHRcdHR5cGU6ICdub2RlJ1xuXHRcdFx0XHRpZiBpbmRleCBpcyAwIGFuZCBsdmwgaXMgMFxuXHRcdFx0XHRcdHNpZ25hbE9iai5zdGF0ZSA9IG9wZW5lZDogeWVzXG5cdFx0XHRcdGlmIGx2bCBpcyBzaWduYWxQYXJ0cy5sZW5ndGggLSAxXG5cdFx0XHRcdFx0c2lnbmFsT2JqLnR5cGUgPSAnbGVhZidcblx0XHRcdFx0dW5sZXNzIGlzU2lnbmFsQWRkZWRbaWRdP1xuXHRcdFx0XHRcdHNpZ25hbFRyZWUucHVzaCBzaWduYWxPYmpcblx0XHRcdFx0XHRpc1NpZ25hbEFkZGVkW2lkXSA9IDFcblxuXG5cdFx0c2VsZWN0YWJsZUlkID0gXCIje0BfY29udGFpbmVySWR9LXdhdmVmb3JtLWFkZC1zaWduYWwtc2VsZWN0XCJcblx0XHRkaWFsb2dUaXRsZSA9IFwiQWRkIFNpZ25hbHNcIlxuXHRcdGRpYWxvZ01lc3NhZ2UgPSBcIlwiXCJcblx0XHRcdDxkaXYgY2xhc3M9XCJkaWFsb2ctaW5wdXQtZ3JvdXBcIj5cblx0XHRcdFx0PGxhYmVsIGZvcj1cImZpbHRlclwiPkZpbHRlcjogPC9sYWJlbD5cblx0XHRcdFx0PGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cImZpbHRlclwiIGlkPVwiZmlsdGVyXCIgdmFsdWU9XCJcIj5cblx0XHRcdDwvZGl2PlxuXHRcdFx0PGRpdj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cIndhdmVmb3JtLXNpZ25hbC10cmVlXCIgaWQ9XFxcIiN7c2VsZWN0YWJsZUlkfVxcXCI+PC9kaXY+XG5cdFx0XHQ8L2Rpdj5cIlwiXCJcblx0XHQkKFwiIyN7QF9tb2RhbERpYWxvZ0lkfVwiKS5odG1sIGRpYWxvZ01lc3NhZ2Vcblx0XHQkKFwiIyN7c2VsZWN0YWJsZUlkfVwiKS5qc3RyZWUoXG5cdFx0XHRwbHVnaW5zOlxuXHRcdFx0XHRbXG5cdFx0XHRcdFx0J3dob2xlcm93J1xuXHRcdFx0XHRcdCd0eXBlcydcblx0XHRcdFx0XHQndW5pcXVlJ1xuXHRcdFx0XHRcdCdzZWFyY2gnXG5cdFx0XHRcdF1cblx0XHRcdHNlYXJjaDpcblx0XHRcdFx0Y2xvc2Vfb3BlbmVkX29uY2xlYXI6IG5vXG5cdFx0XHRcdGZ1enp5OiBub1xuXHRcdFx0XHRjYXNlX2luc2Vuc2l0aXZlOiB5ZXNcblx0XHRcdFx0c2hvd19vbmx5X21hdGNoZXMgOiB5ZXNcblx0XHRcdFx0c2hvd19vbmx5X21hdGNoZXNfY2hpbGRyZW46IHllc1xuXHRcdFx0dHlwZXM6XG5cdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdGljb246ICcvaW1hZ2VzL3RyZWUtaWNvbnMvQmxhbmsucG5nJ1xuXHRcdFx0XHRcdCcjJzpcblx0XHRcdFx0XHRcdGljb246ICcvaW1hZ2VzL3RyZWUtaWNvbnMvRm9sZGVyLnBuZydcblx0XHRcdFx0XHRcdHZhbGlkX2NoaWxkcmVuOiBbJ25vZGUnXVxuXHRcdFx0XHRcdG5vZGU6XG5cdFx0XHRcdFx0XHRpY29uOiAnL2ltYWdlcy90cmVlLWljb25zL1NpZ25hbE5vZGUucG5nJ1xuXHRcdFx0XHRcdFx0dmFsaWRfY2hpbGRyZW46IFsnbGVhZiddXG5cdFx0XHRcdFx0bGVhZjpcblx0XHRcdFx0XHRcdGljb246ICcvaW1hZ2VzL3RyZWUtaWNvbnMvU2lnbmFsTGVhZi5wbmcnXG5cdFx0XHRcdFx0XHR2YWxpZF9jaGlsZHJlbjogW11cblx0XHRcdGNvcmU6XG5cdFx0XHRcdHRoZW1lczpcblx0XHRcdFx0XHRuYW1lOiAnZGVmYXVsdC1kYXJrJ1xuXHRcdFx0XHRcdGRvdHM6IG5vXG5cdFx0XHRcdG11bHRpcGxlOiB5ZXNcblx0XHRcdFx0Y2hlY2tfY2FsbGJhY2s6IChvcGVyYXRpb24sIG5vZGUsIG5vZGVQYXJlbnQsIG5vZGVfcG9zaXRpb24sIG1vcmUpIC0+XG5cdFx0XHRcdFx0cmV0dXJuIHllc1xuXHRcdFx0XHRkYXRhOiBzaWduYWxUcmVlXG5cdFx0XHRcdCkuYmluZCgnZGJsY2xpY2suanN0cmVlJywgKChlKSAtPlxuXHRcdFx0XHRcdG5vZGUgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KFwibGlcIilcblx0XHRcdFx0XHRpZiBub2RlLmxlbmd0aFxuXHRcdFx0XHRcdFx0bm9kZUlkID0gbm9kZS5hdHRyICdpZCdcblx0XHRcdFx0XHRcdCNpZiBub2RlSWQ/IGFuZCBub2RlSWQudHJpbSgpIGlzbnQgJydcblx0XHRcdFx0XHRcdFx0I2NvbnNvbGUubG9nIG5vZGVJZFxuXHRcdFx0XHQpKS5iaW5kKCdzZWxlY3Rfbm9kZS5qc3RyZWUnLCAoKGUsIGRhdGEpIC0+XG5cdFx0XHRcdFx0aWYgbm90IHNlYXJjaENsZWFyZWFkXG5cdFx0XHRcdFx0XHQkKCcjZmlsZXMnKS5qc3RyZWUoeWVzKS5zZWFyY2goJycpXG5cdFx0XHRcdFx0XHRzZWFyY2hDbGVhcmVhZCA9IHllc1xuXHRcdFx0XHQpKS5iaW5kKCdrZXlwcmVzcycsICgoZSwgZGF0YSkgLT5cblx0XHRcdFx0XHQjaWYgZS5rZXlDb2RlIGlzIDEyN1xuXHRcdFx0XHRcdFx0I2RlbGV0ZUZpbGUobm8pXG5cdFx0XHRcdCkpXG5cblxuXG5cdFx0aGFuZGxlRmlsdGVyID0gKGUpID0+XG5cdFx0XHRmaWx0ZXJWYWx1ZSA9ICQoXCIjZmlsdGVyXCIpLnZhbCgpLnRyaW0oKS50b0xvd2VyQ2FzZSgpXG5cdFx0XHQkKFwiIyN7c2VsZWN0YWJsZUlkfVwiKS5qc3RyZWUoeWVzKS5zZWFyY2goZmlsdGVyVmFsdWUpXG5cblx0XHQkKFwiI2ZpbHRlclwiKS5vbiAnaW5wdXQnLCBoYW5kbGVGaWx0ZXJcblx0XHRzZWxmID0gQFxuXHRcdGFsZXJ0aWZ5W1wiYWRkU2lnbmFsRGlhbG9nLSN7c2VsZWN0YWJsZUlkfVwiXSBvciBhbGVydGlmeS5kaWFsb2cgXCJhZGRTaWduYWxEaWFsb2ctI3tzZWxlY3RhYmxlSWR9XCIsKC0+XG5cdFx0XHRtYWluOiAoY29udGVudCkgLT5cblx0XHRcdFx0QHNldENvbnRlbnQgY29udGVudFxuXHRcdFx0cHJlcGFyZTogLT5cblx0XHRcdFx0Y29uZmlybWVkID0gbm9cblx0XHRcdFx0aXBJZCA9ICcnXG5cdFx0XHRcdGlwTmFtZSA9ICcnXG5cdFx0XHRcdGlwVG9wTW9kdWxlID0gJydcblx0XHRcdFx0aXBPd25lciA9ICcnXG5cdFx0XHRcdG92ZXJ3cml0ZSA9IG5vXG5cdFx0XHRcdG1hdGNoSWQgPSBudWxsXG5cdFx0XHRcdHdhaXQgPSBub1xuXHRcdFx0c2V0dXA6IC0+XG5cdFx0XHRcdFx0Zm9jdXM6XG5cdFx0XHRcdFx0XHRlbGVtZW50OiAnI2ZpbHRlcidcblx0XHRcdFx0XHRcdHNlbGVjdDogeWVzXG5cdFx0XHRcdFx0b3B0aW9uczpcblx0XHRcdFx0XHRcdHRpdGxlOiB0aXRsZVxuXHRcdFx0XHRcdFx0bWF4aW1pemFibGU6IG5vXG5cdFx0XHRcdFx0XHRyZXNpemFibGU6IG5vXG5cdFx0XHRcdFx0XHRwYWRkaW5nOiB5ZXNcblx0XHRcdFx0XHRcdGNsb3NhYmxlQnlEaW1tZXI6IG5vXG5cdFx0XHRcdFx0XHR0cmFuc2l0aW9uOid6b29tJ1xuXHRcdFx0XHRcdGJ1dHRvbnM6W1xuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHR0ZXh0OiAnQWRkJ1xuXHRcdFx0XHRcdFx0XHRrZXk6IDEzXG5cdFx0XHRcdFx0XHRcdGNsYXNzTmFtZTogYWxlcnRpZnkuZGVmYXVsdHMudGhlbWUub2tcblx0XHRcdFx0XHRcdFx0YXR0cnM6XG5cdFx0XHRcdFx0XHRcdFx0YXR0cmlidXRlOid2YWx1ZSdcblx0XHRcdFx0XHRcdFx0c2NvcGU6J2F1eGlsaWFyeSdcblx0XHRcdFx0XHRcdFx0ZWxlbWVudDogdW5kZWZpbmVkXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdHRleHQ6ICdDYW5jZWwnXG5cdFx0XHRcdFx0XHRcdGludm9rZU9uQ2xvc2U6IHllc1xuXHRcdFx0XHRcdFx0XHRjbGFzc05hbWU6IGFsZXJ0aWZ5LmRlZmF1bHRzLnRoZW1lLm9rXG5cdFx0XHRcdFx0XHRcdGF0dHJzOlxuXHRcdFx0XHRcdFx0XHRcdGF0dHJpYnV0ZTondmFsdWUnXG5cdFx0XHRcdFx0XHRcdHNjb3BlOidhdXhpbGlhcnknXG5cdFx0XHRcdFx0XHRcdGVsZW1lbnQ6IHVuZGVmaW5lZFxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdF1cblx0XHRcdHNldHRpbmdzOlxuXHRcdFx0XHRjYWxsYmFjazogLT5cblx0XHRcdGNhbGxiYWNrOiAoY2xvc2VFdmVudCkgPT5cblx0XHRcdFx0XHRcdGlmIGNsb3NlRXZlbnQuaW5kZXggaXMgMFxuXHRcdFx0XHRcdFx0XHRzZWxlY3Rpb25JZHMgPSAkKFwiIyN7c2VsZWN0YWJsZUlkfVwiKS5qc3RyZWUoeWVzKS5nZXRfc2VsZWN0ZWQoKVxuXHRcdFx0XHRcdFx0XHRybUluZGljZXMgPSBbXVxuXHRcdFx0XHRcdFx0XHRmb3IgaWQgaW4gc2VsZWN0aW9uSWRzXG5cdFx0XHRcdFx0XHRcdFx0bm9kZSA9ICQoXCIjI3tzZWxlY3RhYmxlSWR9XCIpLmpzdHJlZSh5ZXMpLmdldF9ub2RlIGlkXG5cdFx0XHRcdFx0XHRcdFx0Y29udGludWUgdW5sZXNzIG5vZGU/XG5cdFx0XHRcdFx0XHRcdFx0bm9kZUlkID0gbm9kZS5kYXRhLnNpZ25hbElkXG5cdFx0XHRcdFx0XHRcdFx0c2VsZWN0ZWRTaWduYWwgPSB1bmRlZmluZWRcblx0XHRcdFx0XHRcdFx0XHRzZWxlY3Rpb25JbmRleCA9IG5vZGUuZGF0YS5pbmRleFxuXHRcdFx0XHRcdFx0XHRcdGZvciBycywgaW5kIGluIHNlbGYucmVtb3ZlZFNpZ25hbHNcblx0XHRcdFx0XHRcdFx0XHRcdGlmIHJzLmlkIGlzIG5vZGVJZFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzZWxlY3RlZFNpZ25hbCA9IHJzXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHNlbGVjdGlvbkluZGV4ID0gaW5kXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrXG5cdFx0XHRcdFx0XHRcdFx0Y29udGludWUgdW5sZXNzIHNlbGVjdGVkU2lnbmFsXG5cdFx0XHRcdFx0XHRcdFx0aWYgbm9kZSBhbmQgbm9kZS50eXBlIGlzICdsZWFmJ1xuXHRcdFx0XHRcdFx0XHRcdFx0c2VsZWN0aW9uTmFtZSA9IG5vZGVJZFxuXHRcdFx0XHRcdFx0XHRcdFx0dW5sZXNzIHNlbGVjdGlvbk5hbWUgaW4gc2VsZi5pbmNsdWRlZFNpZ25hbHNcblx0XHRcdFx0XHRcdFx0XHRcdFx0c2VsZi5yZW5kZXJlZFNpZ25hbHMucHVzaCBzZWxlY3RlZFNpZ25hbFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRybUluZGljZXMucHVzaCBzZWxlY3Rpb25JbmRleFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzZWxmLmV4Y2x1ZGVkU2lnbmFscy5zcGxpY2Ugc2VsZi5leGNsdWRlZFNpZ25hbHMuaW5kZXhPZiBzZWxlY3Rpb25OYW1lLCAxXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHNlbGYuaW5jbHVkZWRTaWduYWxzLnB1c2ggc2VsZWN0aW9uTmFtZVxuXG5cdFx0XHRcdFx0XHRcdHJtSW5kaWNlcy5zb3J0KClcblx0XHRcdFx0XHRcdFx0cm1Db3VudGVyID0gMFxuXHRcdFx0XHRcdFx0XHRmb3IgaW5kIGluIHJtSW5kaWNlc1xuXHRcdFx0XHRcdFx0XHRcdHNlbGYucmVtb3ZlZFNpZ25hbHMuc3BsaWNlIGluZCAtIHJtQ291bnRlciwgMVxuXHRcdFx0XHRcdFx0XHRcdHJtQ291bnRlcisrXG5cblx0XHRcdFx0XHRcdFx0c2VsZi5yZWRyYXcoKVxuXHRcdFx0XHRcdFx0XHQkKFwiIyN7c2VsZi5fbW9kYWxEaWFsb2dJZH1cIikuZW1wdHkoKVxuXG5cdFx0XHRcdFx0XHRcdGlmIHNlbGYuX29uQ2hhbmdlTGlzdGVuZXJcblx0XHRcdFx0XHRcdFx0XHRzZWxmLl9vbkNoYW5nZUxpc3RlbmVyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0dHlwZTogJ2FkZCdcblxuXHRcdFx0aG9va3M6XG5cdFx0XHRcdG9uY2xvc2U6IC0+XG5cdFx0XHRcdFx0JChcIiMje3NlbGYuX21vZGFsRGlhbG9nSWR9XCIpLmh0bWwoJycpXG5cdFx0KSwgeWVzXG5cdFx0ZGlhbG9nSW5zdGFuY2UgPSBhbGVydGlmeVtcImFkZFNpZ25hbERpYWxvZy0je3NlbGVjdGFibGVJZH1cIl0oJChcIiMje0BfbW9kYWxEaWFsb2dJZH1cIikuZ2V0KDApKS5zZXQoJ3RpdGxlJywgdGl0bGUpXG5cblxuXHRcdHJldHVyblxuXG5cdFx0JChcIiMje0BfbW9kYWxEaWFsb2dJZH1cIikuZGlhbG9nXG5cdFx0XHRyZXNpemFibGU6IHllc1xuXHRcdFx0bW9kYWw6IHllc1xuXHRcdFx0dGl0bGU6IGRpYWxvZ1RpdGxlXG5cdFx0XHRoZWlnaHQ6IDQwMCxcblx0XHRcdHdpZHRoOiAnYXV0bycsXG5cdFx0XHRidXR0b25zOlxuXHRcdFx0XHQnQWRkJzogPT5cblx0XHRcdFx0XHRzZWxlY3Rpb25JZHMgPSAkKFwiIyN7c2VsZWN0YWJsZUlkfVwiKS5qc3RyZWUoeWVzKS5nZXRfc2VsZWN0ZWQoKVxuXHRcdFx0XHRcdHJtSW5kaWNlcyA9IFtdXG5cdFx0XHRcdFx0Zm9yIGlkIGluIHNlbGVjdGlvbklkc1xuXHRcdFx0XHRcdFx0bm9kZSA9ICQoXCIjI3tzZWxlY3RhYmxlSWR9XCIpLmpzdHJlZSh5ZXMpLmdldF9ub2RlIGlkXG5cdFx0XHRcdFx0XHRpZiBub2RlIGFuZCBub2RlLnR5cGUgaXMgJ2xlYWYnXG5cdFx0XHRcdFx0XHRcdHNlbGVjdGlvbkluZGV4ID0gbm9kZS5kYXRhLmluZGV4XG5cdFx0XHRcdFx0XHRcdHNlbGVjdGlvbk5hbWUgPSBAcmVtb3ZlZFNpZ25hbHNbc2VsZWN0aW9uSW5kZXhdLnNpZ25hbC5uYW1lXG5cdFx0XHRcdFx0XHRcdHVubGVzcyBzZWxlY3Rpb25OYW1lIGluIEBpbmNsdWRlZFNpZ25hbHNcblx0XHRcdFx0XHRcdFx0XHRAcmVuZGVyZWRTaWduYWxzLnB1c2ggQHJlbW92ZWRTaWduYWxzW3NlbGVjdGlvbkluZGV4XVxuXHRcdFx0XHRcdFx0XHRcdHJtSW5kaWNlcy5wdXNoIHNlbGVjdGlvbkluZGV4XG5cdFx0XHRcdFx0XHRcdFx0QGV4Y2x1ZGVkU2lnbmFscy5zcGxpY2UgQGV4Y2x1ZGVkU2lnbmFscy5pbmRleE9mIHNlbGVjdGlvbk5hbWUsIDFcblx0XHRcdFx0XHRcdFx0XHRAaW5jbHVkZWRTaWduYWxzLnB1c2ggc2VsZWN0aW9uTmFtZVxuXG5cblx0XHRcdFx0XHRybUluZGljZXMuc29ydCgpXG5cdFx0XHRcdFx0cm1Db3VudGVyID0gMFxuXHRcdFx0XHRcdGZvciBpbmQgaW4gcm1JbmRpY2VzXG5cdFx0XHRcdFx0XHRAcmVtb3ZlZFNpZ25hbHMuc3BsaWNlIGluZCAtIHJtQ291bnRlciwgMVxuXHRcdFx0XHRcdFx0cm1Db3VudGVyKytcblx0XHRcdFx0XHQkKFwiIyN7QF9tb2RhbERpYWxvZ0lkfVwiKS5kaWFsb2coJ2Nsb3NlJylcblx0XHRcdFx0XHQkKFwiW2FyaWEtZGVzY3JpYmVkYnk9XFxcIiN7QF9tb2RhbERpYWxvZ0lkfVxcXCJdXCIpLnJlbW92ZSgpXG5cdFx0XHRcdFx0QHJlZHJhdygpIGlmIHJtSW5kaWNlcy5sZW5ndGhcblx0XHRcdFx0XHQkKFwiIyN7QF9tb2RhbERpYWxvZ0lkfVwiKS5lbXB0eSgpXG5cblx0XHRcdFx0XHRpZiBAX29uQ2hhbmdlTGlzdGVuZXJcblx0XHRcdFx0XHRcdEBfb25DaGFuZ2VMaXN0ZW5lclxuXHRcdFx0XHRcdFx0XHRcdFx0dHlwZTogJ2FkZCdcblx0XHRcdFx0J0NhbmNlbCc6IC0+XG5cdFx0XHRcdFx0JChAKS5kaWFsb2coJ2Nsb3NlJylcblx0XHRcdFx0XHQkKFwiW2FyaWEtZGVzY3JpYmVkYnk9XFxcIiN7QF9tb2RhbERpYWxvZ0lkfVxcXCJdXCIpLnJlbW92ZSgpXG5cdFx0XHRjbG9zZTogPT5cblx0XHRcdFx0JChcIiMje0BfbW9kYWxEaWFsb2dJZH1cIikuZW1wdHkoKVxuXHRcdFx0XHQkKFwiW2FyaWEtZGVzY3JpYmVkYnk9XFxcIiN7QF9tb2RhbERpYWxvZ0lkfVxcXCJdXCIpLnJlbW92ZSgpXG5cblx0Y29uZmlybWF0aW9uRGlhbG9nID0gKHRpdGxlLCBodG1sQ29udGVudCwgY2IsIHdpZHRoID0gMzUwLCBoZWlnaHQgPSAxNTApIC0+XG5cdFx0JChcIiMje0BfbW9kYWxEaWFsb2dJZH1cIikuaHRtbCBodG1sQ29udGVudFxuXG5cdFx0Y29uZmlybWVkID0gbm9cblxuXHRcdGFsZXJ0aWZ5LndhdmVmb3JtQ29uZmlybWF0aW9uRGlhbG9nIG9yIGFsZXJ0aWZ5LmRpYWxvZyAnd2F2ZWZvcm1Db25maXJtYXRpb25EaWFsb2cnLCgtPlxuXHRcdFx0bWFpbjogKGNvbnRlbnQpIC0+XG5cdFx0XHRcdEBzZXRDb250ZW50IGNvbnRlbnRcblx0XHRcdHByZXBhcmU6IC0+XG5cdFx0XHRcdGNvbmZpcm1lZCA9IG5vXG5cdFx0XHRzZXR1cDogLT5cblx0XHRcdFx0XHRvcHRpb25zOlxuXHRcdFx0XHRcdFx0dGl0bGU6IHRpdGxlXG5cdFx0XHRcdFx0XHRtYXhpbWl6YWJsZTogbm9cblx0XHRcdFx0XHRcdHJlc2l6YWJsZTogbm9cblx0XHRcdFx0XHRcdHBhZGRpbmc6IHllc1xuXHRcdFx0XHRcdFx0Y2xvc2FibGVCeURpbW1lcjogbm9cblx0XHRcdFx0XHRcdHRyYW5zaXRpb246ICd6b29tJ1xuXHRcdFx0XHRcdGJ1dHRvbnM6W1xuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHR0ZXh0OiAnT0snXG5cdFx0XHRcdFx0XHRcdGtleTogMTNcblx0XHRcdFx0XHRcdFx0Y2xhc3NOYW1lOiBhbGVydGlmeS5kZWZhdWx0cy50aGVtZS5va1xuXHRcdFx0XHRcdFx0XHRhdHRyczpcblx0XHRcdFx0XHRcdFx0XHRhdHRyaWJ1dGU6J3ZhbHVlJ1xuXHRcdFx0XHRcdFx0XHRzY29wZTonYXV4aWxpYXJ5J1xuXHRcdFx0XHRcdFx0XHRlbGVtZW50OiB1bmRlZmluZWRcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0dGV4dDogJ0NhbmNlbCdcblx0XHRcdFx0XHRcdFx0aW52b2tlT25DbG9zZTogeWVzXG5cdFx0XHRcdFx0XHRcdGNsYXNzTmFtZTogYWxlcnRpZnkuZGVmYXVsdHMudGhlbWUub2tcblx0XHRcdFx0XHRcdFx0YXR0cnM6XG5cdFx0XHRcdFx0XHRcdFx0YXR0cmlidXRlOid2YWx1ZSdcblx0XHRcdFx0XHRcdFx0c2NvcGU6J2F1eGlsaWFyeSdcblx0XHRcdFx0XHRcdFx0ZWxlbWVudDogdW5kZWZpbmVkXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XVxuXHRcdFx0Y2FsbGJhY2s6IChjbG9zZUV2ZW50KSAtPlxuXHRcdFx0XHRpZiBjbG9zZUV2ZW50LmluZGV4IGlzIDBcblx0XHRcdFx0XHRjb25maXJtZWQgPSB5ZXNcblx0XHRcdHNldHRpbmdzOlxuXHRcdFx0XHRjYWxsYmFjazogLT5cblx0XHRcdGhvb2tzOlxuXHRcdFx0XHRvbmNsb3NlOiAtPlxuXHRcdFx0XHRcdCQoXCIjI3tAX21vZGFsRGlhbG9nSWR9XCIpLmh0bWwoJycpXG5cdFx0XHRcdFx0QHNldHRpbmdzLmNhbGxiYWNrIGNvbmZpcm1lZFxuXHRcdCksIHllc1xuXHRcdGFsZXJ0aWZ5LndhdmVmb3JtQ29uZmlybWF0aW9uRGlhbG9nKCQoXCIjI3tAX21vZGFsRGlhbG9nSWR9XCIpLmdldCgwKSkuc2V0KCd0aXRsZScsIHRpdGxlKS5zZXQoJ2NhbGxiYWNrJywgY2IpXG5cblx0cmVtb3ZlU2lnbmFsOiAtPlxuXHRcdHJldHVybiB1bmxlc3MgQGhpZ2hsaWdodGVkXG5cdFx0c2lnbmFsSW5kZXggPSBAcmVuZGVyZWRTaWduYWxzLmluZGV4T2YgQGhpZ2hsaWdodGVkLnNpZ25hbFxuXHRcdHNpZ25hbCA9IEBoaWdobGlnaHRlZC5zaWduYWwuc2lnbmFsXG5cdFx0c2lnbmFsTmFtZSA9IHNpZ25hbC5uYW1lXG5cdFx0ZGlhbG9nVGl0bGUgPSBcIlJlbW92ZSBTaWduYWwgI3tzaWduYWxOYW1lfT9cIlxuXHRcdGRpYWxvZ01lc3NhZ2UgPSBcIjx0YWJsZT48dGJvZHk+PHRyPjx0ZD48aSBjbGFzcz1cXFwiZmEgZmEtZXhjbGFtYXRpb24tdHJpYW5nbGUgZmEtMnhcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIiBzdHlsZT1cXFwidmVydGljYWwtYWxpZ246IG1pZGRsZTtcXFwiPjwvaT48L3RkPjx0ZCBzdHlsZT1cXFwicGFkZGluZy1sZWZ0OiAxZW07XFxcIj48cD5EbyB5b3Ugd2FudCB0byByZW1vdmUgdGhlIHNlbGVjdGVkIHNpZ25hbD88L3A+PC90ZD48L3RyPjwvdGJvZHk+PC90YWJsZT5cIlxuXHRcdGNvbmZpcm1hdGlvbkRpYWxvZy5iaW5kKEApIGRpYWxvZ1RpdGxlLCBkaWFsb2dNZXNzYWdlLCAoY29uZmlybWVkKSA9PlxuXHRcdFx0aWYgY29uZmlybWVkXG5cdFx0XHRcdGlmIEBoaWdobGlnaHRlZFxuXHRcdFx0XHRcdEBoaWdobGlnaHRlZC5maWxsID0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0QGhpZ2hsaWdodGVkLm9wYWNpdHkgPSAwXG5cdFx0XHRcdEBoaWdobGlnaHRlZCA9IHVuZGVmaW5lZFxuXHRcdFx0XHRAaGlnaGxpZ2h0ZWRJbmRleCA9IHVuZGVmaW5lZFxuXHRcdFx0XHR1bmxlc3Mgc2lnbmFsSW5kZXggaW4gQGV4Y2x1ZGVkU2lnbmFsc1xuXHRcdFx0XHRcdEByZW1vdmVkU2lnbmFscy5wdXNoIEByZW5kZXJlZFNpZ25hbHNbc2lnbmFsSW5kZXhdXG5cdFx0XHRcdFx0QHJlbmRlcmVkU2lnbmFscy5zcGxpY2Ugc2lnbmFsSW5kZXgsIDFcblx0XHRcdFx0XHRAZXhjbHVkZWRTaWduYWxzLnB1c2ggc2lnbmFsSW5kZXhcblx0XHRcdFx0XHRAaW5jbHVkZWRTaWduYWxzLnNwbGljZSBAaW5jbHVkZWRTaWduYWxzLmluZGV4T2Ygc2lnbmFsSW5kZXgsIDFcblx0XHRcdFx0XHRAcmVkcmF3KClcblx0XHRcdFx0aWYgQF9vbkNoYW5nZUxpc3RlbmVyXG5cdFx0XHRcdFx0QF9vbkNoYW5nZUxpc3RlbmVyXG5cdFx0XHRcdFx0XHRcdFx0dHlwZTogJ3JlbW92ZSdcblx0XHRyZXR1cm5cblx0XHQkKFwiIyN7QF9tb2RhbERpYWxvZ0lkfVwiKS5odG1sIGRpYWxvZ01lc3NhZ2Vcblx0XHQkKFwiIyN7QF9tb2RhbERpYWxvZ0lkfVwiKS5kaWFsb2dcblx0XHRcdHJlc2l6YWJsZTogbm9cblx0XHRcdG1vZGFsOiB5ZXNcblx0XHRcdHRpdGxlOiBkaWFsb2dUaXRsZVxuXHRcdFx0aGVpZ2h0OiAxNTAsXG5cdFx0XHR3aWR0aDogMzIwLFxuXHRcdFx0YnV0dG9uczpcblx0XHRcdFx0J1JlbW92ZSc6ID0+XG5cblx0XHRcdFx0J0NhbmNlbCc6IC0+XG5cdFx0XHRcdFx0JChAKS5kaWFsb2coJ2Nsb3NlJylcblx0XHRcdFx0XHQkKFwiW2FyaWEtZGVzY3JpYmVkYnk9XFxcIiN7QF9tb2RhbERpYWxvZ0lkfVxcXCJdXCIpLnJlbW92ZSgpXG5cdFx0XHRjbG9zZTogPT5cblx0XHRcdFx0JChcIiMje0BfbW9kYWxEaWFsb2dJZH1cIikuaHRtbCAnJ1xuXG5cdG1vdmVGaXJzdDogLT5cblx0XHRyZXR1cm4gaWYgQHJlbmRlckZyb20gaXMgMFxuXHRcdEByZW5kZXJGcm9tID0gMFxuXHRcdEByZW5kZXJUbyA9IEByZW5kZXJGcm9tICsgQF9yZW5kZXJEaXN0XG5cdFx0QHJlbmRlclRvID0gQGVuZFRpbWUgaWYgQHJlbmRlclRvID4gQGVuZFRpbWVcblx0XHRAcmVkcmF3KClcblx0XHRAc2V0Q3Vyc29yVGltZSBAY3VycmVudEV4YWN0VGltZVxuXG5cdG1vdmVMZWZ0OiAtPlxuXHRcdHJldHVybiBpZiBAcmVuZGVyRnJvbSBpcyAwXG5cdFx0ZmFjdG9yID0gTWF0aC5mbG9vciBAX3JlbmRlckRpc3QgLyA4LjBcblx0XHRuZXdGcm9tID0gQHJlbmRlckZyb20gLSBmYWN0b3Jcblx0XHRuZXdGcm9tID0gMCBpZiBuZXdGcm9tIDwgMFxuXHRcdG5ld1RvID0gbmV3RnJvbSArIEBfcmVuZGVyRGlzdFxuXHRcdG5ld1RvID0gQGVuZFRpbWUgaWYgbmV3VG8gPiBAZW5kVGltZVxuXHRcdEByZW5kZXJGcm9tID0gbmV3RnJvbVxuXHRcdEByZW5kZXJUbyA9IG5ld1RvXG5cdFx0QHJlZHJhdygpXG5cdFx0QHNldEN1cnNvclRpbWUgQGN1cnJlbnRFeGFjdFRpbWVcblxuXHRtb3ZlUmlnaHQ6IC0+XG5cdFx0cmV0dXJuIGlmIEByZW5kZXJUbyBpcyBAZW5kVGltZVxuXHRcdGZhY3RvciA9IE1hdGguZmxvb3IgQF9yZW5kZXJEaXN0IC8gOC4wXG5cdFx0bmV3VG8gPSBAcmVuZGVyVG8gKyBmYWN0b3Jcblx0XHRuZXdUbyA9IEBlbmRUaW1lIGlmIG5ld1RvID4gQGVuZFRpbWVcblx0XHRuZXdGcm9tID0gbmV3VG8gLSBAX3JlbmRlckRpc3Rcblx0XHRuZXdGcm9tID0gMCBpZiBuZXdGcm9tIDwgMFxuXHRcdEByZW5kZXJGcm9tID0gbmV3RnJvbVxuXHRcdEByZW5kZXJUbyA9IG5ld1RvXG5cdFx0QHJlZHJhdygpXG5cdFx0QHNldEN1cnNvclRpbWUgQGN1cnJlbnRFeGFjdFRpbWVcblxuXHR6b29tSW46IC0+XG5cdFx0ZmFjdG9yID0gTWF0aC5mbG9vciBAX3JlbmRlckRpc3QgLyA0LjBcblx0XHRuZXdGcm9tID0gQHJlbmRlckZyb20gKyBmYWN0b3Jcblx0XHRuZXdUbyA9IEByZW5kZXJUbyAtIGZhY3RvclxuXHRcdGlmIEBfY3Vyc29yP1xuXHRcdFx0Y3Vyc29yVGltZSA9IE1hdGgucm91bmQgQF9jdXJzb3IudGltZVxuXHRcdFx0aWYgY3Vyc29yVGltZSAtIGZhY3RvciA8IEByZW5kZXJGcm9tXG5cdFx0XHRcdG5ld0Zyb20gPSBAcmVuZGVyRnJvbVxuXHRcdFx0XHRuZXdUbyA9IEByZW5kZXJUbyAtIDIgKiBmYWN0b3Jcblx0XHRcdGVsc2UgaWYgY3Vyc29yVGltZSArIGZhY3RvciA+IEByZW5kZXJUb1xuXHRcdFx0XHRuZXdGcm9tID0gQHJlbmRlckZyb20gKyAyICogZmFjdG9yXG5cdFx0XHRcdG5ld1RvID0gQHJlbmRlclRvXG5cdFx0XHRlbHNlXG5cdFx0XHRcdG5ld0Zyb20gPSBjdXJzb3JUaW1lIC0gZmFjdG9yXG5cdFx0XHRcdG5ld1RvID0gY3Vyc29yVGltZSArIGZhY3RvclxuXG5cdFx0cmV0dXJuIGlmIG5ld0Zyb20gPiBuZXdUbyBvciBuZXdUbyA8IDAgb3IgbmV3RnJvbSA+PSBuZXdUb1xuXHRcdG5ld0Rpc3RhbmNlID0gbmV3VG8gLSBuZXdGcm9tXG5cdFx0QHNjYWxlRmFjdG9yID0gbmV3RGlzdGFuY2UgLyBAb3JpZ2luYWxFbmRUaW1lXG5cdFx0cmV0dXJuIGlmIEBzY2FsZUZhY3RvciA8IDAuMDJcblx0XHRpZiBmYWN0b3Jcblx0XHRcdEByZW5kZXJGcm9tID0gbmV3RnJvbVxuXHRcdFx0QHJlbmRlclRvID0gbmV3VG9cblx0XHRcdEByZWRyYXcoKVxuXHRcdFx0QHNldEN1cnNvclRpbWUgQGN1cnJlbnRFeGFjdFRpbWVcblxuXHR6b29tT3V0OiAtPlxuXHRcdHpvb21EaXN0YW5jZSA9ICAyICogQF9yZW5kZXJEaXN0XG5cdFx0bmV3RnJvbSA9IHVuZGVmaW5lZFxuXHRcdG5ld1RvID0gdW5kZWZpbmVkXG5cdFx0aWYgem9vbURpc3RhbmNlID4gQG9yaWdpbmFsRW5kVGltZVxuXHRcdFx0bmV3RnJvbSA9IDBcblx0XHRcdG5ld1RvID0gQGVuZFRpbWVcblx0XHRlbHNlXG5cdFx0XHRmYWN0b3IgPSBNYXRoLmZsb29yIEBfcmVuZGVyRGlzdCAvIDIuMFxuXHRcdFx0bmV3RnJvbSA9IEByZW5kZXJGcm9tIC0gZmFjdG9yXG5cdFx0XHRuZXdUbyA9IEByZW5kZXJUbyArIGZhY3RvclxuXHRcdFx0aWYgbmV3VG8gPiBAZW5kVGltZVxuXHRcdFx0XHRuZXdUbyA9IEBlbmRUaW1lXG5cdFx0XHRcdG5ld0Zyb20gPSBuZXdUbyAtIHpvb21EaXN0YW5jZVxuXHRcdFx0aWYgbmV3RnJvbSA8IDBcblx0XHRcdFx0bmV3RnJvbSA9IDBcblxuXHRcdG5ld0Rpc3RhbmNlID0gbmV3VG8gLSBuZXdGcm9tXG5cdFx0QHNjYWxlRmFjdG9yID0gbmV3RGlzdGFuY2UgLyBAb3JpZ2luYWxFbmRUaW1lXG5cblx0XHRAcmVuZGVyRnJvbSA9IG5ld0Zyb21cblx0XHRAcmVuZGVyVG8gPSBuZXdUb1xuXHRcdEByZWRyYXcoKVxuXHRcdEBzZXRDdXJzb3JUaW1lIEBjdXJyZW50RXhhY3RUaW1lXG5cblx0em9vbUFsbDogLT5cblx0XHRyZXR1cm4gaWYgQHJlbmRlckZyb20gaXMgMCBhbmQgQHJlbmRlclRvIGlzIEBlbmRUaW1lXG5cdFx0QHJlbmRlckZyb20gPSAwXG5cdFx0QHJlbmRlclRvID0gQGVuZFRpbWVcblx0XHRAcmVkcmF3KClcblx0XHRAc2V0Q3Vyc29yVGltZSBAY3VycmVudEV4YWN0VGltZVxuXG5cdHNldFJhZGl4OiAobmV3UmFkaXgpIC0+XG5cdFx0cmV0dXJuIHVubGVzcyBuZXdSYWRpeCBpbiBbUkFESVhfQklOLCBSQURJWF9ERUMsIFJBRElYX0hFWF1cblx0XHRjaGFuZ2VkID0gKEByYWRpeCAhPSBuZXdSYWRpeClcblx0XHRAcmFkaXggPSBuZXdSYWRpeFxuXHRcdEByZWZyZXNoQ3VycmVudFZhbHVlcygpXG5cdFx0QHJlZnJlc2hTaWduYWxWYWx1ZXMoKVxuXHRcdGlmIGNoYW5nZWRcblx0XHRcdEByZWRyYXcoKVxuXG5cdGlzQnVzOiAoc2lnbmFsTmFtZSkgLT5cblx0XHRtYXRjaGVzID0gL1tcXHNcXFNdK1xcWyhcXGQrKVxcOihcXGQrKVxcXVxccyovLmV4ZWMgc2lnbmFsTmFtZVxuXHRcdHVubGVzcyBtYXRjaGVzP1xuXHRcdFx0bm9cblx0XHRlbHNlXG5cdFx0XHRzdGFydDogbWF0Y2hlc1sxXVxuXHRcdFx0ZW5kOiBtYXRjaGVzWzJdXG5cblx0Y2xlYXJDYW52YXM6IC0+XG5cdFx0QF9jYW52YXMuY2xlYXIoKVxuXG5cdGJpblRvRGVjOiAodmFsdWUpIC0+XG5cdFx0TnVtYmVyLnBhcnNlSW50KHZhbHVlLCAyKS50b1N0cmluZygxMClcblxuXHRiaW5Ub0hleDogKHZhbHVlKSAtPlxuXHRcdE51bWJlci5wYXJzZUludCh2YWx1ZSwgMikudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKClcblxuXHRwYWQ6ICh2YWx1ZSwgd2lkdGgsIHBhZGRpbmcgPSAnMCcpIC0+XG5cdFx0dmFsdWUgPSB2YWx1ZSArICcnXG5cdFx0aWYgdmFsdWUubGVuZ3RoID49IHdpZHRoIHRoZW4gdmFsdWUgZWxzZSBuZXcgQXJyYXkod2lkdGggLSB2YWx1ZS5sZW5ndGggKyAxKS5qb2luKHBhZGRpbmcpICsgdmFsdWVcblxuXHRwb2ludERpc3Q6ICh4MSwgeTEsIHgyLCB5MikgLT5cblx0XHRNYXRoLnNxcnQgTWF0aC5wb3coeDIgLSB4MSwgMikgKyBNYXRoLnBvdyh5MiAtIHkxLCAyKVxuXG5cdGdldFJhbmRvbUNvbG9yOiAtPlxuXHRcdGxldHRlcnMgPSAnMDEyMzQ1Njc4OUFCQ0RFRicuc3BsaXQgJydcblx0XHRjb2xvciA9ICcjJ1xuXHRcdGZvciBpIGluIFswLi4uNl1cblx0XHRcdGNvbG9yICs9IGxldHRlcnNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTYpXVxuXHRcdGNvbG9yXG5cblxuXHRjZWlsSW50OiAodmFsdWUsIGRpdmlzKSAtPlxuXHRcdHZhbHVlID0gTWF0aC5yb3VuZCB2YWx1ZVxuXHRcdHdoaWxlIHZhbHVlICUgZGl2aXNcblx0XHRcdHZhbHVlKytcblx0XHR2YWx1ZVxuXG5cdGZsb29ySW50OiAodmFsdWUsIGRpdmlzKSAtPlxuXHRcdHZhbHVlID0gTWF0aC5yb3VuZCB2YWx1ZVxuXHRcdHdoaWxlIHZhbHVlICUgZGl2aXNcblx0XHRcdHZhbHVlLS1cblx0XHR2YWx1ZVxuXG5cdHJvdW5kSW50OiAodmFsdWUsICBkaXZpcykgLT5cblx0XHR2YWx1ZSA9IE1hdGgucm91bmQgdmFsdWVcblx0XHRyZXR1cm4gdmFsdWUgdW5sZXNzIHZhbHVlICUgZGl2aXNcblx0XHRjZWlsVmFsdWUgPSB2YWx1ZVxuXHRcdGZsb29yVmFsdWUgPSB2YWx1ZVxuXHRcdHdoaWxlIGNlaWxWYWx1ZSAlIGRpdmlzIGFuZCBmbG9vclZhbHVlICUgZGl2aXNcblx0XHRcdGNlaWxWYWx1ZSsrXG5cdFx0XHRmbG9vclZhbHVlLS1cblx0XHRpZiBjZWlsVmFsdWUgJSBkaXZpcyB0aGVuIGZsb29yVmFsdWUgZWxzZSBjZWlsVmFsdWVcblxuXHRjZWlsRml2ZTogKHZhbHVlKSAtPlxuXHRcdEBjZWlsSW50IHZhbHVlLCA1XG5cblx0Zmxvb3JGaXZlOiAodmFsdWUpIC0+XG5cdFx0QGZsb29ySW50IHZhbHVlLCA1XG5cblx0cm91bmRGaXZlOiAodmFsdWUpIC0+XG5cdFx0QHJvdW5kSW50IHZhbHVlLCA1XG5cblx0X2luaXRDYW52YXM6IC0+XG5cdFx0QF9jYW52YXMgPSBuZXcgZmFicmljLkNhbnZhcyBAX2NhbnZhc0lkLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0d2lkdGg6IEBjYW52YXNXaWR0aFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0aGVpZ2h0OiBAY2FudmFzSGVpZ2h0XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRiYWNrZ3JvdW5kQ29sb3I6IERFRkFVTFRfQ09MT1IuQ0FOVkFTX0JBQ0tHUk9VTkRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHJlbmRlck9uQWRkUmVtb3ZlOiBub1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0c2VsZWN0aW9uOiBub1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0c3RhdGVmdWw6IG5vXG5cdFx0QF9jb250ZXh0ID0gQF9jYW52YXMuZ2V0Q29udGV4dCAnMmQnXG5cdFx0QF9pc0RyYWdnaW5nID0gbm9cblx0XHRAX2RyYWdnZWRTaWduYWwgPSB1bmRlZmluZWRcblx0XHRAX2RyYWdnZWRPcmlnaW5hbFggPSB1bmRlZmluZWRcblx0XHRAX2RyYWdnZWRPcmlnaW5hbFkgPSB1bmRlZmluZWRcblx0XHRAX2RyYWdnZWRNb3VzZVggPSB1bmRlZmluZWRcblx0XHRAX2RyYWdnZWRNb3VzZVkgPSB1bmRlZmluZWRcblx0XHRAX2RyYWdSZWN0YW5nbGUgPSB1bmRlZmluZWRcblx0XHRAX2RyYWdSZWN0YW5nbGVPcmlnaW5hbEhlaWdodCA9IHVuZGVmaW5lZFxuXG5cblxuXHRcdEBfY2FudmFzLm9uICdtb3VzZTpkb3duJywgKG9wdGlvbnMpID0+XG5cdFx0XHRpZiBvcHRpb25zLnRhcmdldFxuXHRcdFx0XHRwb2ludGVyID0gQF9jYW52YXMuZ2V0UG9pbnRlciBvcHRpb25zLmVcblx0XHRcdFx0aWYgb3B0aW9ucy50YXJnZXQuc2lnbmFsXG5cdFx0XHRcdFx0aWYgQGhpZ2hsaWdodGVkXG5cdFx0XHRcdFx0XHRAaGlnaGxpZ2h0ZWQuZmlsbCA9IHVuZGVmaW5lZFxuXHRcdFx0XHRcdFx0QGhpZ2hsaWdodGVkLm9wYWNpdHkgPSAwXG5cdFx0XHRcdFx0QGhpZ2hsaWdodGVkID0gb3B0aW9ucy50YXJnZXRcblx0XHRcdFx0XHRAaGlnaGxpZ2h0ZWRJbmRleCA9IEByZW5kZXJlZFNpZ25hbHMuaW5kZXhPZiBvcHRpb25zLnRhcmdldC5zaWduYWxcblx0XHRcdFx0XHRvcHRpb25zLnRhcmdldC5maWxsID0gREVGQVVMVF9DT0xPUi5TSUdOQUxfSElHSExJR0hUXG5cdFx0XHRcdFx0b3B0aW9ucy50YXJnZXQub3BhY2l0eSA9IERFRkFVTFRfT1BBQ0lUWS5TSUdOQUxfSElHSExJR0hUXG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRpZiBAaGlnaGxpZ2h0ZWRcblx0XHRcdFx0XHRcdEBoaWdobGlnaHRlZC5maWxsID0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0XHRAaGlnaGxpZ2h0ZWQub3BhY2l0eSA9IDBcblx0XHRcdFx0XHRAaGlnaGxpZ2h0ZWQgPSB1bmRlZmluZWRcblx0XHRcdFx0XHRAaGlnaGxpZ2h0ZWRJbmRleCA9IHVuZGVmaW5lZFxuXG5cdFx0XHRcdGlmIG9wdGlvbnMudGFyZ2V0LnNpZ25hbFxuXHRcdFx0XHRcdEBfZHJhZ2dlZFNpZ25hbCA9IG9wdGlvbnMudGFyZ2V0XG5cdFx0XHRcdFx0QF9kcmFnZ2VkT3JpZ2luYWxYID0gb3B0aW9ucy50YXJnZXQubGVmdFxuXHRcdFx0XHRcdEBfZHJhZ2dlZE9yaWdpbmFsWSA9IG9wdGlvbnMudGFyZ2V0LnRvcFxuXHRcdFx0XHRcdEBfZHJhZ2dlZE1vdXNlWCA9IHBvaW50ZXIueFxuXHRcdFx0XHRcdEBfZHJhZ2dlZE1vdXNlWSA9IHBvaW50ZXIueVxuXHRcdFx0XHRAX2lzRHJhZ2dpbmcgPSB5ZXNcblx0XHRcdFx0QF9jYW52YXMucmVuZGVyQWxsKClcblx0XHRAX2NhbnZhcy5vbiAnbW91c2U6bW92ZScsIChvcHRpb25zKSA9PlxuXHRcdFx0aWYgQF9pc0RyYWdnaW5nXG5cdFx0XHRcdHBvaW50ZXIgPSBALl9jYW52YXMuZ2V0UG9pbnRlciBvcHRpb25zLmVcblx0XHRcdFx0aWYgQF9kcmFnZ2VkU2lnbmFsP1xuXHRcdFx0XHRcdEBfZHJhZ2dlZFNpZ25hbC5zZXRUb3AgKHBvaW50ZXIueSAtIEBfZHJhZ2dlZE1vdXNlWSkgKyBAX2RyYWdnZWRPcmlnaW5hbFlcblx0XHRcdFx0XHRAX2RyYWdnZWRTaWduYWwub3BhY2l0eSA9IERFRkFVTFRfT1BBQ0lUWS5TSUdOQUxfRFJBR0dFRFxuXHRcdFx0XHRpZiBAX2RyYWdSZWN0YW5nbGU/IGFuZCBvcHRpb25zLnRhcmdldCBpc250IEBfZHJhZ1JlY3RhbmdsZVxuXHRcdFx0XHRcdEBfZHJhZ1JlY3RhbmdsZS5zZXRIZWlnaHQgQF9kcmFnUmVjdGFuZ2xlT3JpZ2luYWxIZWlnaHRcblx0XHRcdFx0XHRAX2RyYWdSZWN0YW5nbGVPcmlnaW5hbEhlaWdodCA9IHVuZGVmaW5lZFxuXHRcdFx0XHRcdEBfZHJhZ1JlY3RhbmdsZS5maWxsID0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0QF9kcmFnUmVjdGFuZ2xlLm9wYWNpdHkgPSAwXG5cdFx0XHRcdFx0QF9kcmFnUmVjdGFuZ2xlID0gdW5kZWZpbmVkXG5cblx0XHRcdFx0aWYgb3B0aW9ucy50YXJnZXQgYW5kIG9wdGlvbnMudGFyZ2V0LnNpZ25hbCBhbmQgb3B0aW9ucy50YXJnZXQgaXNudCBAX2RyYWdnZWRTaWduYWwgYW5kIG9wdGlvbnMudGFyZ2V0IGlzbnQgQF9kcmFnUmVjdGFuZ2xlXG5cdFx0XHRcdFx0XHRAX2RyYWdSZWN0YW5nbGUgPSBvcHRpb25zLnRhcmdldFxuXHRcdFx0XHRcdFx0QF9kcmFnUmVjdGFuZ2xlLmZpbGwgPSBERUZBVUxUX0NPTE9SLlNJR05BTF9EUkFHR0VEXG5cdFx0XHRcdFx0XHRAX2RyYWdSZWN0YW5nbGUub3BhY2l0eSA9IERFRkFVTFRfT1BBQ0lUWS5TSUdOQUxfRFJBR0dFRFxuXHRcdFx0XHRcdFx0QF9kcmFnUmVjdGFuZ2xlT3JpZ2luYWxIZWlnaHQgPSBAX2RyYWdSZWN0YW5nbGUuaGVpZ2h0XG5cdFx0XHRcdFx0XHRAX2RyYWdSZWN0YW5nbGUuc2V0SGVpZ2h0IEBfZHJhZ1JlY3RhbmdsZS5oZWlnaHQgLyAyLjBcblx0XHRcdFx0QF9jYW52YXMucmVuZGVyQWxsKClcblxuXHRcdEBfY2FudmFzLm9uICdtb3VzZTp1cCcsIChvcHRpb25zKSA9PlxuXHRcdFx0aWYgQF9pc0RyYWdnaW5nXG5cdFx0XHRcdHZhbGlkVGFyZ2V0ID0gb3B0aW9ucy50YXJnZXQgYW5kIG9wdGlvbnMudGFyZ2V0LnNpZ25hbCBhbmQgQF9kcmFnZ2VkU2lnbmFsIGlzbnQgb3B0aW9ucy50YXJnZXRcblx0XHRcdFx0aWYgQF9kcmFnZ2VkU2lnbmFsP1xuXHRcdFx0XHRcdGlmIEBfZHJhZ2dlZE9yaWdpbmFsWD9cblx0XHRcdFx0XHRcdGlmIHZhbGlkVGFyZ2V0XG5cdFx0XHRcdFx0XHRcdCNTd2FwIFNpZ25hbHNcblx0XHRcdFx0XHRcdFx0c291cmNlSW5kZXggPSBAcmVuZGVyZWRTaWduYWxzLmluZGV4T2YgQF9kcmFnZ2VkU2lnbmFsLnNpZ25hbFxuXHRcdFx0XHRcdFx0XHR0YXJnZXRJbmRleCA9IEByZW5kZXJlZFNpZ25hbHMuaW5kZXhPZiBvcHRpb25zLnRhcmdldC5zaWduYWxcblx0XHRcdFx0XHRcdFx0QHJlbmRlcmVkU2lnbmFscy5zcGxpY2UodGFyZ2V0SW5kZXgsIDAsIEByZW5kZXJlZFNpZ25hbHMuc3BsaWNlKHNvdXJjZUluZGV4LCAxKVswXSk7XG5cdFx0XHRcdFx0XHRcdEBfZHJhZ2dlZFNpZ25hbC5zZXRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGxlZnQ6IEBfZHJhZ2dlZE9yaWdpbmFsWFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dG9wOiBAX2RyYWdnZWRPcmlnaW5hbFlcblx0XHRcdFx0XHRcdFx0aWYgQF9kcmFnUmVjdGFuZ2xlP1xuXHRcdFx0XHRcdFx0XHRcdEBfZHJhZ1JlY3RhbmdsZS5zZXRIZWlnaHQgQF9kcmFnUmVjdGFuZ2xlT3JpZ2luYWxIZWlnaHRcblx0XHRcdFx0XHRcdFx0XHRAX2RyYWdSZWN0YW5nbGUuZmlsbCA9IHVuZGVmaW5lZFxuXHRcdFx0XHRcdFx0XHRcdEBfZHJhZ1JlY3RhbmdsZU9yaWdpbmFsSGVpZ2h0ID0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0XHRcdFx0QF9kcmFnUmVjdGFuZ2xlLm9wYWNpdHkgPSAwXG5cdFx0XHRcdFx0XHRcdFx0QF9kcmFnUmVjdGFuZ2xlID0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0XHRcdEBoaWdobGlnaHRlZEluZGV4ID0gdGFyZ2V0SW5kZXhcblx0XHRcdFx0XHRcdFx0QHJlZHJhdygpXG5cdFx0XHRcdFx0XHRcdGlmIEBfb25DaGFuZ2VMaXN0ZW5lclxuXHRcdFx0XHRcdFx0XHRcdEBfb25DaGFuZ2VMaXN0ZW5lclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHR5cGU6ICdzb3J0J1xuXHRcdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0XHRAX2RyYWdnZWRTaWduYWwuc2V0XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRsZWZ0OiBAX2RyYWdnZWRPcmlnaW5hbFhcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRvcDogQF9kcmFnZ2VkT3JpZ2luYWxZXG5cblx0XHRcdGlmIEBfZHJhZ1JlY3RhbmdsZT9cblx0XHRcdFx0QF9kcmFnUmVjdGFuZ2xlLnNldEhlaWdodCBAX2RyYWdSZWN0YW5nbGVPcmlnaW5hbEhlaWdodFxuXHRcdFx0XHRAX2RyYWdSZWN0YW5nbGVPcmlnaW5hbEhlaWdodCA9IHVuZGVmaW5lZFxuXHRcdFx0XHRAX2RyYWdSZWN0YW5nbGUuZmlsbCA9IHVuZGVmaW5lZFxuXHRcdFx0XHRAX2RyYWdSZWN0YW5nbGUub3BhY2l0eSA9IDBcblx0XHRcdFx0QF9kcmFnUmVjdGFuZ2xlID0gdW5kZWZpbmVkXG5cdFx0XHRAX2lzRHJhZ2dpbmcgPSBub1xuXHRcdFx0QF9kcmFnZ2VkU2lnbmFsID0gdW5kZWZpbmVkXG5cdFx0XHRAX2RyYWdnZWRPcmlnaW5hbFggPSB1bmRlZmluZWRcblx0XHRcdEBfZHJhZ2dlZE9yaWdpbmFsWSA9IHVuZGVmaW5lZFxuXHRcdFx0QF9kcmFnZ2VkTW91c2VYID0gdW5kZWZpbmVkXG5cdFx0XHRAX2RyYWdnZWRNb3VzZVkgPSB1bmRlZmluZWRcblxuXG5cdFx0XHRwb2ludGVyID0gQF9jYW52YXMuZ2V0UG9pbnRlciBvcHRpb25zLmVcblx0XHRcdGlmIHBvaW50ZXIueCA+IFNJR05BTF9OQU1FU19CT1hfV0lEVEhcblx0XHRcdFx0QHNldEN1cnNvclRpbWUgQF9wb3NUb1RpbWUgcG9pbnRlci54LCBudWxsLCBub1xuXG5cdFx0XHRAX2NhbnZhcy5yZW5kZXJBbGwoKVxuXG5cblx0X2RyYXdWYWx1ZTogKHZhbHVlT2JqZWN0LCBvcmlnaW5YLCBvcmlnaW5ZLCBpbml0aWFsVmFsdWUsIHNpZ25hbENvbG9yID0gREVGQVVMVF9DT0xPUi5TSUdOQUwsIGJ1c1NpZ25hbCA9IG5vLCBzdGFydCA9IEByZW5kZXJGcm9tLCBlbmQgPSBAcmVuZGVyVG8pLT5cblx0XHR2YWx1ZSA9IHZhbHVlT2JqZWN0LnZhbHVlXG5cdFx0c3RhcnRQb3MgPSBAX3RpbWVUb1Bvcyh2YWx1ZU9iamVjdC5zdGFydClcblx0XHRlbmRQb3MgPSBAX3RpbWVUb1Bvcyh2YWx1ZU9iamVjdC5lbmQpXG5cblx0XHRpc0xhc3QgPSB2YWx1ZU9iamVjdC5sYXN0XG5cblx0XHR1bmxlc3MgYnVzU2lnbmFsXG5cdFx0XHRwb2x5UG9pbnRzID0gW11cblx0XHRcdGxhc3RQb2ludCA9IFtdXG5cdFx0XHRwb2x5TGluZSA9IHVuZGVmaW5lZFxuXHRcdFx0aWYgaW5pdGlhbFZhbHVlIGlzICcwJyBvciBpbml0aWFsVmFsdWUgaXMgJ3gnIG9yIGluaXRpYWxWYWx1ZSBpcyAneidcblx0XHRcdFx0aWYgdmFsdWUgaXMgJzEnXG5cdFx0XHRcdFx0cG9seVBvaW50cy5wdXNoXG5cdFx0XHRcdFx0XHRcdHg6IEBfdGltZVRvUG9zKHZhbHVlT2JqZWN0LnN0YXJ0KVxuXHRcdFx0XHRcdFx0XHR5OiBvcmlnaW5ZXG5cdFx0XHRcdFx0cG9seVBvaW50cy5wdXNoXG5cdFx0XHRcdFx0XHRcdHg6IEBfdGltZVRvUG9zKHZhbHVlT2JqZWN0LnN0YXJ0KVxuXHRcdFx0XHRcdFx0XHR5OiBvcmlnaW5ZIC0gU0lHTkFMX0hFSUdIVFxuXHRcdFx0XHRcdHBvbHlQb2ludHMucHVzaFxuXHRcdFx0XHRcdFx0XHR4OiBAX3RpbWVUb1Bvcyh2YWx1ZU9iamVjdC5lbmQpXG5cdFx0XHRcdFx0XHRcdHk6IG9yaWdpblkgLSBTSUdOQUxfSEVJR0hUXG5cblx0XHRcdFx0XHRsYXN0UG9pbnQgPSBbcG9seVBvaW50c1twb2x5UG9pbnRzLmxlbmd0aCAtIDFdLngsIHBvbHlQb2ludHNbcG9seVBvaW50cy5sZW5ndGggLSAxXS55XVxuXG5cdFx0XHRcdFx0cG9seUxpbmUgPSBuZXcgZmFicmljLlBvbHlsaW5lIHBvbHlQb2ludHMsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRzdHJva2U6IHNpZ25hbENvbG9yXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRmaWxsOiB1bmRlZmluZWRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHNlbGVjdGFibGU6IG5vXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRoYXNDb250cm9sczogbm9cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGhhc1JvdGF0aW5nUG9pbnQ6IG5vXG5cblx0XHRcdFx0XHRAX2NhbnZhcy5hZGQgcG9seUxpbmVcblxuXHRcdFx0XHRlbHNlIGlmIHZhbHVlIGlzICcwJ1xuXHRcdFx0XHRcdHBvbHlQb2ludHMucHVzaFxuXHRcdFx0XHRcdFx0XHR4OiBAX3RpbWVUb1Bvcyh2YWx1ZU9iamVjdC5zdGFydClcblx0XHRcdFx0XHRcdFx0eTogb3JpZ2luWVxuXHRcdFx0XHRcdHBvbHlQb2ludHMucHVzaFxuXHRcdFx0XHRcdFx0XHR4OiBAX3RpbWVUb1Bvcyh2YWx1ZU9iamVjdC5lbmQpXG5cdFx0XHRcdFx0XHRcdHk6IG9yaWdpbllcblxuXHRcdFx0XHRcdGxhc3RQb2ludCA9IFtwb2x5UG9pbnRzW3BvbHlQb2ludHMubGVuZ3RoIC0gMV0ueCwgcG9seVBvaW50c1twb2x5UG9pbnRzLmxlbmd0aCAtIDFdLnldXG5cdFx0XHRcdFx0cG9seUxpbmUgPSBuZXcgZmFicmljLlBvbHlsaW5lIHBvbHlQb2ludHMsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRzdHJva2U6IHNpZ25hbENvbG9yXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRmaWxsOiB1bmRlZmluZWRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHNlbGVjdGFibGU6IG5vXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRoYXNDb250cm9sczogbm9cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGhhc1JvdGF0aW5nUG9pbnQ6IG5vXG5cblx0XHRcdFx0XHRAX2NhbnZhcy5hZGQgcG9seUxpbmVcblxuXHRcdFx0XHRlbHNlIGlmIHZhbHVlIGlzICd4J1xuXHRcdFx0XHRcdHBvbHlQb2ludHMucHVzaFxuXHRcdFx0XHRcdFx0XHR4OiBAX3RpbWVUb1Bvcyh2YWx1ZU9iamVjdC5zdGFydClcblx0XHRcdFx0XHRcdFx0eTogb3JpZ2luWVxuXHRcdFx0XHRcdHBvbHlQb2ludHMucHVzaFxuXHRcdFx0XHRcdFx0XHR4OiBAX3RpbWVUb1Bvcyh2YWx1ZU9iamVjdC5lbmQpXG5cdFx0XHRcdFx0XHRcdHk6IG9yaWdpbllcblxuXHRcdFx0XHRcdGxhc3RQb2ludCA9IFtwb2x5UG9pbnRzW3BvbHlQb2ludHMubGVuZ3RoIC0gMV0ueCwgcG9seVBvaW50c1twb2x5UG9pbnRzLmxlbmd0aCAtIDFdLnldXG5cdFx0XHRcdFx0cG9seUxpbmUgPSBuZXcgZmFicmljLlBvbHlsaW5lIHBvbHlQb2ludHMsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRzdHJva2U6IERFRkFVTFRfQ09MT1IuU0lHTkFMX0RDXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRmaWxsOiB1bmRlZmluZWRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHNlbGVjdGFibGU6IG5vXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRoYXNDb250cm9sczogbm9cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGhhc1JvdGF0aW5nUG9pbnQ6IG5vXG5cblx0XHRcdFx0XHRAX2NhbnZhcy5hZGQgcG9seUxpbmVcblx0XHRcdFx0ZWxzZSBpZiB2YWx1ZS50b0xvd2VyQ2FzZSgpIGlzICd6J1xuXHRcdFx0XHRcdHBvbHlQb2ludHMucHVzaFxuXHRcdFx0XHRcdFx0XHR4OiBAX3RpbWVUb1Bvcyh2YWx1ZU9iamVjdC5zdGFydClcblx0XHRcdFx0XHRcdFx0eTogb3JpZ2luWVxuXHRcdFx0XHRcdHBvbHlQb2ludHMucHVzaFxuXHRcdFx0XHRcdFx0XHR4OiBAX3RpbWVUb1Bvcyh2YWx1ZU9iamVjdC5lbmQpXG5cdFx0XHRcdFx0XHRcdHk6IG9yaWdpbllcblxuXHRcdFx0XHRcdGxhc3RQb2ludCA9IFtwb2x5UG9pbnRzW3BvbHlQb2ludHMubGVuZ3RoIC0gMV0ueCwgcG9seVBvaW50c1twb2x5UG9pbnRzLmxlbmd0aCAtIDFdLnldXG5cdFx0XHRcdFx0cG9seUxpbmUgPSBuZXcgZmFicmljLlBvbHlsaW5lIHBvbHlQb2ludHMsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRzdHJva2U6IERFRkFVTFRfQ09MT1IuU0lHTkFMX0lNUEVEXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRmaWxsOiB1bmRlZmluZWRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHNlbGVjdGFibGU6IG5vXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRoYXNDb250cm9sczogbm9cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGhhc1JvdGF0aW5nUG9pbnQ6IG5vXG5cblx0XHRcdFx0XHRAX2NhbnZhcy5hZGQgcG9seUxpbmVcblxuXHRcdFx0ZWxzZSBpZiBpbml0aWFsVmFsdWUgaXMgJzEnXG5cdFx0XHRcdGlmIHZhbHVlIGlzICcxJ1xuXHRcdFx0XHRcdHBvbHlQb2ludHMucHVzaFxuXHRcdFx0XHRcdFx0XHRcdHg6IEBfdGltZVRvUG9zKHZhbHVlT2JqZWN0LnN0YXJ0KVxuXHRcdFx0XHRcdFx0XHRcdHk6IG9yaWdpbllcblxuXHRcdFx0XHRcdHBvbHlQb2ludHMucHVzaFxuXHRcdFx0XHRcdFx0XHRcdHg6IEBfdGltZVRvUG9zKHZhbHVlT2JqZWN0LmVuZClcblx0XHRcdFx0XHRcdFx0XHR5OiBvcmlnaW5ZXG5cblx0XHRcdFx0XHRsYXN0UG9pbnQgPSBbcG9seVBvaW50c1twb2x5UG9pbnRzLmxlbmd0aCAtIDFdLngsIHBvbHlQb2ludHNbcG9seVBvaW50cy5sZW5ndGggLSAxXS55XVxuXHRcdFx0XHRcdHBvbHlMaW5lID0gbmV3IGZhYnJpYy5Qb2x5bGluZSBwb2x5UG9pbnRzLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0c3Ryb2tlOiBzaWduYWxDb2xvclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZmlsbDogdW5kZWZpbmVkXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRzZWxlY3RhYmxlOiBub1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0aGFzQ29udHJvbHM6IG5vXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRoYXNSb3RhdGluZ1BvaW50OiBub1xuXG5cdFx0XHRcdFx0QF9jYW52YXMuYWRkIHBvbHlMaW5lXG5cblx0XHRcdFx0ZWxzZSBpZiB2YWx1ZSBpcyAnMCdcblx0XHRcdFx0XHRwb2x5UG9pbnRzLnB1c2hcblx0XHRcdFx0XHRcdFx0eDogQF90aW1lVG9Qb3ModmFsdWVPYmplY3Quc3RhcnQpXG5cdFx0XHRcdFx0XHRcdHk6IG9yaWdpbllcblx0XHRcdFx0XHRwb2x5UG9pbnRzLnB1c2hcblx0XHRcdFx0XHRcdFx0eDogQF90aW1lVG9Qb3ModmFsdWVPYmplY3Quc3RhcnQpXG5cdFx0XHRcdFx0XHRcdHk6IG9yaWdpblkgKyBTSUdOQUxfSEVJR0hUXG5cdFx0XHRcdFx0cG9seVBvaW50cy5wdXNoXG5cdFx0XHRcdFx0XHRcdHg6IEBfdGltZVRvUG9zKHZhbHVlT2JqZWN0LmVuZClcblx0XHRcdFx0XHRcdFx0eTogb3JpZ2luWSArIFNJR05BTF9IRUlHSFRcblxuXHRcdFx0XHRcdGxhc3RQb2ludCA9IFtwb2x5UG9pbnRzW3BvbHlQb2ludHMubGVuZ3RoIC0gMV0ueCwgcG9seVBvaW50c1twb2x5UG9pbnRzLmxlbmd0aCAtIDFdLnldXG5cdFx0XHRcdFx0cG9seUxpbmUgPSBuZXcgZmFicmljLlBvbHlsaW5lIHBvbHlQb2ludHMsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRzdHJva2U6IHNpZ25hbENvbG9yXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRmaWxsOiB1bmRlZmluZWRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHNlbGVjdGFibGU6IG5vXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRoYXNDb250cm9sczogbm9cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGhhc1JvdGF0aW5nUG9pbnQ6IG5vXG5cblx0XHRcdFx0XHRAX2NhbnZhcy5hZGQgcG9seUxpbmVcblxuXHRcdFx0XHRlbHNlIGlmIHZhbHVlIGlzICd4JyBvciB2YWx1ZS50b0xvd2VyQ2FzZSgpIGlzICd6J1xuXHRcdFx0XHRcdHBvbHlQb2ludHMucHVzaFxuXHRcdFx0XHRcdFx0XHR4OiBAX3RpbWVUb1Bvcyh2YWx1ZU9iamVjdC5zdGFydClcblx0XHRcdFx0XHRcdFx0eTogb3JpZ2luWVxuXHRcdFx0XHRcdHBvbHlQb2ludHMucHVzaFxuXHRcdFx0XHRcdFx0XHR4OiBAX3RpbWVUb1Bvcyh2YWx1ZU9iamVjdC5zdGFydClcblx0XHRcdFx0XHRcdFx0eTogb3JpZ2luWSArIFNJR05BTF9IRUlHSFRcblx0XHRcdFx0XHRwb2x5UG9pbnRzLnB1c2hcblx0XHRcdFx0XHRcdFx0eDogQF90aW1lVG9Qb3ModmFsdWVPYmplY3QuZW5kKVxuXHRcdFx0XHRcdFx0XHR5OiBvcmlnaW5ZICsgU0lHTkFMX0hFSUdIVFxuXG5cdFx0XHRcdFx0bGFzdFBvaW50ID0gW3BvbHlQb2ludHNbcG9seVBvaW50cy5sZW5ndGggLSAxXS54LCBwb2x5UG9pbnRzW3BvbHlQb2ludHMubGVuZ3RoIC0gMV0ueV1cblx0XHRcdFx0XHRwb2x5TGluZSA9IG5ldyBmYWJyaWMuUG9seWxpbmUgcG9seVBvaW50cyxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHN0cm9rZTogc2lnbmFsQ29sb3Jcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGZpbGw6IHVuZGVmaW5lZFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0c2VsZWN0YWJsZTogbm9cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGhhc0NvbnRyb2xzOiBub1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0aGFzUm90YXRpbmdQb2ludDogbm9cblxuXHRcdFx0XHRcdEBfY2FudmFzLmFkZCBwb2x5TGluZVxuXG5cblx0XHRcdHJldHVybiBbbGFzdFBvaW50WzBdLCBsYXN0UG9pbnRbMV0sIHZhbHVlLCBwb2x5TGluZV1cblx0XHRlbHNlXG5cdFx0XHRwb2x5UG9pbnRzID0gW11cblx0XHRcdGxhc3RQb2ludCA9IFtdXG5cdFx0XHRwb2ludHNUaW1lID0gRGF0ZS5ub3coKVxuXHRcdFx0cG9seVBvaW50cy5wdXNoXG5cdFx0XHRcdFx0eDogQF90aW1lVG9Qb3ModmFsdWVPYmplY3Quc3RhcnQpICsgU0lHTkFMX0JVU19TTE9QRVxuXHRcdFx0XHRcdHk6IG9yaWdpblkgKyBTSUdOQUxfSEVJR0hUIC8gMi4wXG5cdFx0XHRwb2x5UG9pbnRzLnB1c2hcblx0XHRcdFx0XHR4OiBAX3RpbWVUb1Bvcyh2YWx1ZU9iamVjdC5zdGFydClcblx0XHRcdFx0XHR5OiBvcmlnaW5ZXG5cdFx0XHRwb2x5UG9pbnRzLnB1c2hcblx0XHRcdFx0XHR4OiBAX3RpbWVUb1Bvcyh2YWx1ZU9iamVjdC5zdGFydCkgKyBTSUdOQUxfQlVTX1NMT1BFXG5cdFx0XHRcdFx0eTogb3JpZ2luWSAtIFNJR05BTF9IRUlHSFQgLyAyLjBcblx0XHRcdHBvbHlQb2ludHMucHVzaFxuXHRcdFx0XHRcdHg6IEBfdGltZVRvUG9zKHZhbHVlT2JqZWN0LmVuZCkgLSBTSUdOQUxfQlVTX1NMT1BFXG5cdFx0XHRcdFx0eTogb3JpZ2luWSAtIFNJR05BTF9IRUlHSFQgLyAyLjBcblx0XHRcdHVubGVzcyBpc0xhc3Rcblx0XHRcdFx0cG9seVBvaW50cy5wdXNoXG5cdFx0XHRcdFx0XHR4OiBAX3RpbWVUb1Bvcyh2YWx1ZU9iamVjdC5lbmQpXG5cdFx0XHRcdFx0XHR5OiBvcmlnaW5ZXG5cdFx0XHRlbHNlXG5cdFx0XHRcdHBvbHlQb2ludHMucHVzaFxuXHRcdFx0XHRcdFx0eDogQF90aW1lVG9Qb3ModmFsdWVPYmplY3QuZW5kKSArIFNJR05BTF9CVVNfU0xPUEUgKyAyXG5cdFx0XHRcdFx0XHR5OiBvcmlnaW5ZIC0gU0lHTkFMX0hFSUdIVCAvIDIuMFxuXHRcdFx0XHRwb2x5UG9pbnRzLnB1c2hcblx0XHRcdFx0XHRcdHg6IEBfdGltZVRvUG9zKHZhbHVlT2JqZWN0LmVuZCkgKyBTSUdOQUxfQlVTX1NMT1BFICsgMlxuXHRcdFx0XHRcdFx0eTogb3JpZ2luWSArIFNJR05BTF9IRUlHSFQgLyAyLjBcblxuXHRcdFx0cG9seVBvaW50cy5wdXNoXG5cdFx0XHRcdFx0eDogQF90aW1lVG9Qb3ModmFsdWVPYmplY3QuZW5kKSAtIFNJR05BTF9CVVNfU0xPUEVcblx0XHRcdFx0XHR5OiBvcmlnaW5ZICsgU0lHTkFMX0hFSUdIVCAvIDIuMFxuXHRcdFx0cG9seVBvaW50cy5wdXNoXG5cdFx0XHRcdFx0eDogQF90aW1lVG9Qb3ModmFsdWVPYmplY3Quc3RhcnQpICsgU0lHTkFMX0JVU19TTE9QRVxuXHRcdFx0XHRcdHk6IG9yaWdpblkgKyBTSUdOQUxfSEVJR0hUIC8gMi4wXG5cblx0XHRcdGxhc3RQb2ludCA9IFtwb2x5UG9pbnRzW3BvbHlQb2ludHMubGVuZ3RoIC0gMV0ueCwgcG9seVBvaW50c1twb2x5UG9pbnRzLmxlbmd0aCAtIDFdLnldXG5cblx0XHRcdHBvbHlXaWR0aCA9IEBwb2ludERpc3QgcG9seVBvaW50c1syXS54LCBwb2x5UG9pbnRzWzJdLnksIHBvbHlQb2ludHNbM10ueCwgcG9seVBvaW50c1szXS55XG5cblx0XHRcdHBvbHlMaW5lID0gbmV3IGZhYnJpYy5Qb2x5bGluZSBwb2x5UG9pbnRzLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzdHJva2U6IGlmIHZhbHVlIGlzICd4JyB0aGVuIERFRkFVTFRfQ09MT1IuU0lHTkFMX0RDIGVsc2UgaWYgdmFsdWUudG9Mb3dlckNhc2UoKSBpcyAneicgdGhlbiBERUZBVUxUX0NPTE9SLlNJR05BTF9JTVBFRCBlbHNlIHNpZ25hbENvbG9yXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGZpbGw6IHVuZGVmaW5lZFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzZWxlY3RhYmxlOiBub1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRoYXNDb250cm9sczogbm9cblx0XHRcdFx0XHRcdFx0XHRcdFx0aGFzUm90YXRpbmdQb2ludDogbm9cblx0XHRcdEBfY2FudmFzLmFkZCBwb2x5TGluZVxuXHRcdFx0Y2VudHJlUG9pbnQgPSBwb2x5TGluZS5nZXRDZW50ZXJQb2ludCgpXG5cblx0XHRcdHBvbHlUZXh0ID0gbmV3IGZhYnJpYy5UZXh0IEBfZ2V0Rm9ybWF0dGVkVmFsdWUodmFsdWUsIHZhbHVlT2JqZWN0LndpZHRoKSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGZvbnRGYW1pbHk6ICdtb25vc3BhY2UnXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRmb250U2l6ZTogMTFcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHNlbGVjdGFibGU6IG5vXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRoYXNDb250cm9sczogbm9cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGhhc1JvdGF0aW5nUG9pbnQ6IG5vXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRmaWxsOiBERUZBVUxUX0NPTE9SLlNJR05BTF9WQUxVRVxuXG5cblx0XHRcdHRleHRWYWx1ZSA9ICcgJyArIHBvbHlUZXh0LnRleHRcblx0XHRcdHRleHRXaWR0aCA9IHBvbHlUZXh0LndpZHRoXG5cblx0XHRcdHdpZHRoT3ZlcmZsb3cgPSB0ZXh0V2lkdGggPiBwb2x5V2lkdGhcblx0XHRcdHdoaWxlIHRleHRXaWR0aCA+IHBvbHlXaWR0aFxuXHRcdFx0XHR0ZXh0VmFsdWUgPSB0ZXh0VmFsdWUuc3Vic3RyIDAsIHRleHRWYWx1ZS5sZW5ndGggLSAxXG5cdFx0XHRcdHBvbHlUZXh0LnNldFRleHQgdGV4dFZhbHVlXG5cdFx0XHRcdHBvbHlUZXh0LnNldExlZnQgcG9seVRleHQubGVmdCArIDFcblx0XHRcdFx0dGV4dFdpZHRoID0gcG9seVRleHQud2lkdGhcblx0XHRcdGlmIHdpZHRoT3ZlcmZsb3dcblx0XHRcdFx0dGV4dFZhbHVlID0gdGV4dFZhbHVlICsgJy4uJ1xuXHRcdFx0XHRwb2x5VGV4dC5zZXRUZXh0IHRleHRWYWx1ZVxuXHRcdFx0XHRwb2x5VGV4dC5zZXRMZWZ0IHBvbHlUZXh0LmxlZnQgKyAxXG5cblx0XHRcdHBvbHlUZXh0LnNldCAnbGVmdCcsIGNlbnRyZVBvaW50LnggLSBwb2x5VGV4dC53aWR0aCAvIDIuMFxuXHRcdFx0cG9seVRleHQuc2V0ICd0b3AnLCBjZW50cmVQb2ludC55IC0gcG9seVRleHQuaGVpZ2h0IC8gMi4wXG5cblxuXHRcdFx0QF9zaWduYWxWYWx1ZVRleHQucHVzaFxuXHRcdFx0XHRcdFx0XHR0ZXh0Ym94OiBwb2x5VGV4dFxuXHRcdFx0XHRcdFx0XHR3aWR0aDogdmFsdWVPYmplY3Qud2lkdGhcblx0XHRcdFx0XHRcdFx0dmFsdWU6IHZhbHVlXG5cdFx0XHRAX2NhbnZhcy5hZGQgcG9seVRleHRcblx0XHRcdHJldHVybiBbQF90aW1lVG9Qb3ModmFsdWVPYmplY3QuZW5kKSwgb3JpZ2luWSwgdmFsdWUsIHBvbHlMaW5lXVxuXG5cblxuXG5cdF9nZXRHcmlkTGluZTogKGNvb3JkcykgLT5cblx0XHRuZXcgZmFicmljLkxpbmUgY29vcmRzLFxuXHRcdFx0ZmlsbDogREVGQVVMVF9DT0xPUi5HUklEX0xJTkVcblx0XHRcdHN0cm9rZTogREVGQVVMVF9DT0xPUi5HUklEX0xJTkVcblx0XHRcdHN0cm9rZVdpZHRoOiAxXG5cdFx0XHRvcGFjaXR5OiAwLjNcblx0XHRcdHNlbGVjdGFibGU6IG5vXG5cdFx0XHRoYXNDb250cm9sczogbm9cblx0XHRcdGhhc1JvdGF0aW5nUG9pbnQ6IG5vXG5cblx0X2RyYXdTaWduYWxOYW1lczogLT5cblx0XHRzaWduYWxQb3MgPSBTSUdOQUxfQk9YX1BBRERJTkcgKyBSVUxFUl9IRUlHSFRcblx0XHRAX3NpZ25hbE5hbWVzID0gW11cblx0XHRAX3NpZ25hbEN1cnJlbnRWYWx1ZXMgPSBbXVxuXHRcdGZvciByZW5kZXJlZCBpbiBAcmVuZGVyZWRTaWduYWxzXG5cdFx0XHRzaWduYWwgPSByZW5kZXJlZC5zaWduYWxcblx0XHRcdGJ1c1NpZ25hbCA9IEBpc0J1cyBzaWduYWwubmFtZVxuXHRcdFx0bmFtZWJveFRleHQgPSBuZXcgZmFicmljLklUZXh0IHNpZ25hbC5uYW1lLFxuXHRcdFx0XHRmb250RmFtaWx5OiAnbW9ub3NwYWNlJ1xuXHRcdFx0XHRsZWZ0OiAxMFxuXHRcdFx0XHR0b3A6ICBzaWduYWxQb3MgKyA0XG5cdFx0XHRcdGZvbnRTaXplOiAxMlxuXHRcdFx0XHRzZWxlY3RhYmxlOiBub1xuXHRcdFx0XHRoYXNDb250cm9sczogbm9cblx0XHRcdFx0aGFzUm90YXRpbmdQb2ludDogbm9cblx0XHRcdFx0d2lkdGg6IFNJR05BTF9CT1hfV0lEVEhcblx0XHRcdFx0aGVpZ2h0OiBTSUdOQUxfQk9YX0hFSUdIVFxuXHRcdFx0XHRmaWxsOiBERUZBVUxUX0NPTE9SLlNJR05BTF9OQU1FXG5cblx0XHRcdHNpZ25hbEN1cnJlbnRWYWx1ZSA9IG5ldyBmYWJyaWMuSVRleHQgJzAnLFxuXHRcdFx0XHRmb250RmFtaWx5OiAnbW9ub3NwYWNlJ1xuXHRcdFx0XHRsZWZ0OiBTSUdOQUxfQk9YX1dJRFRIICsgMTJcblx0XHRcdFx0dG9wOiAgc2lnbmFsUG9zICsgNFxuXHRcdFx0XHRmb250U2l6ZTogMTFcblx0XHRcdFx0c2VsZWN0YWJsZTogbm9cblx0XHRcdFx0aGFzQ29udHJvbHM6IG5vXG5cdFx0XHRcdGhhc1JvdGF0aW5nUG9pbnQ6IG5vXG5cdFx0XHRcdHdpZHRoOiBTSUdOQUxfQk9YX1dJRFRIXG5cdFx0XHRcdGhlaWdodDogU0lHTkFMX0JPWF9IRUlHSFRcblx0XHRcdFx0ZmlsbDogREVGQVVMVF9DT0xPUi5TSUdOQUxfQ1VSUkVOVF9WQUxVRVxuXG5cdFx0XHRAX3NpZ25hbE5hbWVzLnB1c2ggbmFtZWJveFRleHRcblxuXHRcdFx0cmVuZGVyZWQudGV4dCA9IG5hbWVib3hUZXh0XG5cdFx0XHRyZW5kZXJlZC55cG9zID0gc2lnbmFsUG9zXG5cblx0XHRcdEBfc2lnbmFsQ3VycmVudFZhbHVlcy5wdXNoIHNpZ25hbEN1cnJlbnRWYWx1ZVxuXG5cdFx0XHRzaWduYWxQb3MgKz0gKFNJR05BTF9CT1hfSEVJR0hUICsgU0lHTkFMX0JPWF9QQURESU5HKVxuXG5cdFx0QF9jdXJyZW50VmFsdWVMaW5lU3RhcnQgPSBuZXcgZmFicmljLkxpbmUgW1NJR05BTF9CT1hfV0lEVEggKyAxMCwgMCwgU0lHTkFMX0JPWF9XSURUSCArIDEwLCBAX2NhbnZhcy5oZWlnaHRdLFxuXHRcdFx0ZmlsbDogREVGQVVMVF9DT0xPUi5DVVJSRU5UX1ZBTFVFX0xJTkVcblx0XHRcdHN0cm9rZTogREVGQVVMVF9DT0xPUi5DVVJSRU5UX1ZBTFVFX0xJTkVcblx0XHRcdHN0cm9rZVdpZHRoOiAxXG5cdFx0XHRvcGFjaXR5OiAxXG5cdFx0XHRzZWxlY3RhYmxlOiBub1xuXHRcdFx0aGFzQ29udHJvbHM6IG5vXG5cdFx0XHRoYXNSb3RhdGluZ1BvaW50OiBub1xuXHRcdEBfY3VycmVudFZhbHVlTGluZUVuZCA9IG5ldyBmYWJyaWMuTGluZSBbU0lHTkFMX05BTUVTX0JPWF9XSURUSCwgMCwgU0lHTkFMX05BTUVTX0JPWF9XSURUSCwgQF9jYW52YXMuaGVpZ2h0XSxcblx0XHRcdGZpbGw6IERFRkFVTFRfQ09MT1IuQ1VSUkVOVF9WQUxVRV9MSU5FXG5cdFx0XHRzdHJva2U6IERFRkFVTFRfQ09MT1IuQ1VSUkVOVF9WQUxVRV9MSU5FXG5cdFx0XHRzdHJva2VXaWR0aDogMVxuXHRcdFx0b3BhY2l0eTogMVxuXHRcdFx0c2VsZWN0YWJsZTogbm9cblx0XHRcdGhhc0NvbnRyb2xzOiBub1xuXHRcdFx0aGFzUm90YXRpbmdQb2ludDogbm9cblxuXHRcdEBfY2FudmFzLmFkZCBAX2N1cnJlbnRWYWx1ZUxpbmVTdGFydFxuXHRcdEBfY2FudmFzLmFkZCBAX2N1cnJlbnRWYWx1ZUxpbmVFbmRcblxuXHRcdGZvciB0ZXh0YXJlYSBpbiBAX3NpZ25hbE5hbWVzXG5cdFx0XHRAX2NhbnZhcy5hZGQgdGV4dGFyZWFcblx0XHRcdGlmIHRleHRhcmVhLndpZHRoID4gU0lHTkFMX0JPWF9XSURUSFxuXHRcdFx0XHR0ZXh0YXJlYS5zY2FsZVRvV2lkdGggU0lHTkFMX0JPWF9XSURUSCAtIDEwXG5cblxuXG5cblx0X2dldFNpZ25hbFZhbHVlczogKHdhdmUsIHN0YXJ0ID0gQHJlbmRlckZyb20sIGVuZCA9IEByZW5kZXJUbykgLT5cblx0XHRyZXR1cm4gW10gaWYgd2F2ZS5sZW5ndGggaXMgMFxuXHRcdHZhbHVlcyA9IFtdXG5cblx0XHR2YWx1ZUFkZGVkID0gbm9cblx0XHR3YXZlSW5kZXggPSAwXG5cblx0XHRfYmV0d2VlbiA9ICh2YWwsIHN0YXJ0UmFuZ2UgPSBzdGFydCwgZW5kUmFuZ2UgPSBlbmQpIC0+XG5cdFx0XHQodmFsID49IHN0YXJ0UmFuZ2UpIGFuZCAodmFsIDw9IGVuZFJhbmdlKVxuXG5cdFx0d2hpbGUgd2F2ZUluZGV4IDwgd2F2ZS5sZW5ndGhcblx0XHRcdHdhdmVWYWx1ZSA9IHdhdmVbd2F2ZUluZGV4XVxuXHRcdFx0dmFsdWVTdGFydCA9IE51bWJlci5wYXJzZUludCB3YXZlVmFsdWVbMF1cblx0XHRcdHZhbHVlRW5kID0gaWYgd2F2ZUluZGV4IGlzIHdhdmUubGVuZ3RoIC0gMSB0aGVuIGVuZCBlbHNlIE51bWJlci5wYXJzZUludCB3YXZlW3dhdmVJbmRleCArIDFdWzBdXG5cdFx0XHRuZXdWYWx1ZSA9XG5cdFx0XHRcdHN0YXJ0OiAwXG5cdFx0XHRcdGVuZDogMFxuXHRcdFx0XHR2YWx1ZTogd2F2ZVZhbHVlWzFdXG5cblx0XHRcdGlmIF9iZXR3ZWVuKHZhbHVlU3RhcnQpIGFuZCBfYmV0d2Vlbih2YWx1ZUVuZClcblx0XHRcdFx0bmV3VmFsdWUuc3RhcnQgPSB2YWx1ZVN0YXJ0XG5cdFx0XHRcdG5ld1ZhbHVlLmVuZCA9IHZhbHVlRW5kXG5cdFx0XHRlbHNlIGlmIF9iZXR3ZWVuKHZhbHVlU3RhcnQpIGFuZCB2YWx1ZUVuZCA+IGVuZFxuXHRcdFx0XHRuZXdWYWx1ZS5zdGFydCA9IHZhbHVlU3RhcnRcblx0XHRcdFx0bmV3VmFsdWUuZW5kID0gZW5kXG5cdFx0XHRlbHNlIGlmIF9iZXR3ZWVuKHZhbHVlRW5kKSBhbmQgdmFsdWVTdGFydCA8IHN0YXJ0XG5cdFx0XHRcdG5ld1ZhbHVlLnN0YXJ0ID0gc3RhcnRcblx0XHRcdFx0bmV3VmFsdWUuZW5kID0gdmFsdWVFbmRcblx0XHRcdGVsc2Vcblx0XHRcdFx0d2F2ZUluZGV4Kytcblx0XHRcdFx0Y29udGludWVcblxuXHRcdFx0dmFsdWVzLnB1c2ggbmV3VmFsdWVcblx0XHRcdHZhbHVlQWRkZWQgPSB5ZXNcblx0XHRcdHdhdmVJbmRleCsrXG5cblx0XHRyZXR1cm4gW1xuXHRcdFx0e1xuXHRcdFx0XHRzdGFydDogc3RhcnRcblx0XHRcdFx0ZW5kOiBlbmRcblx0XHRcdFx0dmFsdWU6IHdhdmVbd2F2ZS5sZW5ndGggLSAxXVsxXVxuXHRcdFx0fVxuXHRcdF0gdW5sZXNzIHZhbHVlQWRkZWRcblxuXHRcdHZhbHVlc1xuXG5cblx0X3RpbWVUb1BvczogKHRpbWUsIGZyb20gPSBAcmVuZGVyRnJvbSwgcm91bmQgPSB5ZXMpIC0+XG5cdFx0aWYgcm91bmRcblx0XHRcdE1hdGgucm91bmQoU0lHTkFMX05BTUVTX0JPWF9XSURUSCArIHRpbWUgKiBAX3JlbmRlckRpc3RhbmNlRmFjdG9yIC0gTWF0aC5yb3VuZChmcm9tICogQF9yZW5kZXJEaXN0YW5jZUZhY3RvcikpXG5cdFx0ZWxzZVxuXHRcdFx0U0lHTkFMX05BTUVTX0JPWF9XSURUSCArIHRpbWUgKiBAX3JlbmRlckRpc3RhbmNlRmFjdG9yIC0gZnJvbSAqIEBfcmVuZGVyRGlzdGFuY2VGYWN0b3JcblxuXHRfcG9zVG9UaW1lOiAocG9zLCBmcm9tID0gQHJlbmRlckZyb20sIHJvdW5kID0geWVzKSAtPlxuXHRcdGlmIHJvdW5kXG5cdFx0XHRNYXRoLnJvdW5kKChwb3MgLSBTSUdOQUxfTkFNRVNfQk9YX1dJRFRIKSAvIEBfcmVuZGVyRGlzdGFuY2VGYWN0b3IpICsgTWF0aC5yb3VuZCBmcm9tXG5cdFx0ZWxzZVxuXHRcdFx0KHBvcyAtIFNJR05BTF9OQU1FU19CT1hfV0lEVEgpIC8gQF9yZW5kZXJEaXN0YW5jZUZhY3RvciArIGZyb21cblxuXG5cdF9nZXRGb3JtYXR0ZWRWYWx1ZTogKHZhbHVlLCBsZW5ndGggPSA4KSAtPlxuXHRcdGlmIEByYWRpeCBpcyBSQURJWF9ERUNcblx0XHRcdGlmIHZhbHVlIGlzICd4J1xuXHRcdFx0XHRcIiN7QHBhZCh2YWx1ZSwgbGVuZ3RoLCAneCcpfVwiXG5cdFx0XHRlbHNlIGlmIHZhbHVlLnRvTG93ZXJDYXNlKCkgaXMgJ3onXG5cdFx0XHRcdFwiI3tAcGFkKHZhbHVlLCBsZW5ndGgsICd6Jyl9XCJcblx0XHRcdGVsc2Vcblx0XHRcdFx0XCIje0BiaW5Ub0RlYyh2YWx1ZSl9XCJcblx0XHRlbHNlIGlmIEByYWRpeCBpcyBSQURJWF9IRVhcblx0XHRcdGlmIHZhbHVlIGlzICd4J1xuXHRcdFx0XHRcIiN7QHBhZCh2YWx1ZSwgbGVuZ3RoLCAneCcpfVwiXG5cdFx0XHRlbHNlIGlmIHZhbHVlLnRvTG93ZXJDYXNlKCkgaXMgJ3onXG5cdFx0XHRcdFwiI3tAcGFkKHZhbHVlLCBsZW5ndGgsICd6Jyl9XCJcblx0XHRcdGVsc2Vcblx0XHRcdFx0XCIweCN7QGJpblRvSGV4KHZhbHVlKX1cIlxuXHRcdGVsc2UgaWYgQHJhZGl4IGlzIFJBRElYX0JJTlxuXHRcdFx0aWYgdmFsdWUgaXMgJ3gnXG5cdFx0XHRcdFwiI3tAcGFkKHZhbHVlLCBsZW5ndGgsICd4Jyl9XCJcblx0XHRcdGVsc2UgaWYgdmFsdWUudG9Mb3dlckNhc2UoKSBpcyAneidcblx0XHRcdFx0XCIje0BwYWQodmFsdWUsIGxlbmd0aCwgJ3onKX1cIlxuXHRcdFx0ZWxzZVxuXHRcdFx0XHRcIiN7QHBhZCh2YWx1ZSwgbGVuZ3RoKX1cIlxuXG5cblx0X2luaXRMYXlvdXQ6IC0+XG5cdFx0QF9hZGRTaWduYWxCdXR0b25JZCA9IFwiI3tAX2NvbnRhaW5lcklkfS13YXZlZm9ybS1hZGQtYnRuXCJcblx0XHRAX2FkZFNpZ25hbEJ1dHRvbiA9ICQoXCI8YnV0dG9uIGNsYXNzPVxcXCJ3YXZlZm9ybS10b29sYmFyLWJ0blxcXCIgaWQ9XFxcIiN7QF9hZGRTaWduYWxCdXR0b25JZH1cXFwiPkFkZCBTZ2luYWw8L2J1dHRvbj5cIilcblx0XHRAX3JlbW92ZVNpZ25hbEJ1dHRvbklkID0gXCIje0BfY29udGFpbmVySWR9LXdhdmVmb3JtLXJlbW92ZS1idG5cIlxuXHRcdEBfcmVtb3ZlU2lnbmFsQnV0dG9uID0gJChcIjxidXR0b24gY2xhc3M9XFxcIndhdmVmb3JtLXRvb2xiYXItYnRuXFxcIiBpZD1cXFwiI3tAX3JlbW92ZVNpZ25hbEJ1dHRvbklkfVxcXCI+UmVtb3ZlIFNnaW5hbDwvYnV0dG9uPlwiKVxuXHRcdEBfem9vbUluQnV0dG9uSWQgPSBcIiN7QF9jb250YWluZXJJZH0td2F2ZWZvcm0tem9vbWluLWJ0blwiXG5cdFx0QF96b29tSW5CdXR0b24gPSAkKFwiPGJ1dHRvbiBjbGFzcz1cXFwid2F2ZWZvcm0tdG9vbGJhci1idG5cXFwiIGlkPVxcXCIje0Bfem9vbUluQnV0dG9uSWR9XFxcIj5ab29tIEluPC9idXR0b24+XCIpXG5cdFx0QF96b29tT3V0QnV0dG9uSWQgPSBcIiN7QF9jb250YWluZXJJZH0td2F2ZWZvcm0tem9vbW91dC1idG5cIlxuXHRcdEBfem9vbU91dEJ1dHRvbiA9ICQoXCI8YnV0dG9uIGNsYXNzPVxcXCJ3YXZlZm9ybS10b29sYmFyLWJ0blxcXCIgaWQ9XFxcIiN7QF96b29tT3V0QnV0dG9uSWR9XFxcIj5ab29tIE91dDwvYnV0dG9uPlwiKVxuXHRcdEBfem9vbUFsbEJ1dHRvbklkID0gXCIje0BfY29udGFpbmVySWR9LXdhdmVmb3JtLXpvb21hbGwtYnRuXCJcblx0XHRAX3pvb21BbGxCdXR0b24gPSAkKFwiPGJ1dHRvbiBjbGFzcz1cXFwid2F2ZWZvcm0tdG9vbGJhci1idG5cXFwiIGlkPVxcXCIje0Bfem9vbUFsbEJ1dHRvbklkfVxcXCI+Wm9vbSBBbGw8L2J1dHRvbj5cIilcblx0XHRAX2dvdG9GaXJzdEJ1dHRvbklkID0gXCIje0BfY29udGFpbmVySWR9LXdhdmVmb3JtLWdvdG9maXJzdC1idG5cIlxuXHRcdEBfZ290b0ZpcnN0QnV0dG9uID0gJChcIjxidXR0b24gY2xhc3M9XFxcIndhdmVmb3JtLXRvb2xiYXItYnRuXFxcIiBpZD1cXFwiI3tAX2dvdG9GaXJzdEJ1dHRvbklkfVxcXCI+R290byBGaXJzdDwvYnV0dG9uPlwiKVxuXHRcdEBfZ29MZWZ0QnV0dG9uSWQgPSBcIiN7QF9jb250YWluZXJJZH0td2F2ZWZvcm0tZ29sZWZ0LWJ0blwiXG5cdFx0QF9nb0xlZnRCdXR0b24gPSAkKFwiPGJ1dHRvbiBjbGFzcz1cXFwid2F2ZWZvcm0tdG9vbGJhci1idG5cXFwiIGlkPVxcXCIje0BfZ29MZWZ0QnV0dG9uSWR9XFxcIj5HbyBMZWZ0PC9idXR0b24+XCIpXG5cdFx0QF9nb1JpZ2h0QnV0dG9uSWQgPSBcIiN7QF9jb250YWluZXJJZH0td2F2ZWZvcm0tZ29yaWdodC1idG5cIlxuXHRcdEBfZ29SaWdodEJ1dHRvbiA9ICQoXCI8YnV0dG9uIGNsYXNzPVxcXCJ3YXZlZm9ybS10b29sYmFyLWJ0blxcXCIgaWQ9XFxcIiN7QF9nb1JpZ2h0QnV0dG9uSWR9XFxcIj5HbyBSaWdodDwvYnV0dG9uPlwiKVxuXHRcdEBfcmVzZXRCdXR0b25JZCA9IFwiI3tAX2NvbnRhaW5lcklkfS13YXZlZm9ybS1yZXNldC1idG5cIlxuXHRcdEBfcmVzZXRCdXR0b24gPSAkKFwiPGJ1dHRvbiBjbGFzcz1cXFwid2F2ZWZvcm0tdG9vbGJhci1idG5cXFwiIGlkPVxcXCIje0BfZ29SaWdodEJ1dHRvbklkfVxcXCI+UmVzZXQgVGltaW5nIERpYWdyYW08L2J1dHRvbj5cIilcblx0XHRAX3JhZGl4U2VsZWN0QmluSWQgPSBcIiN7QF9jb250YWluZXJJZH0td2F2ZWZvcm0tcmFkaXgtYmluXCJcblx0XHRAX29wdGlvbkJpbiA9ICQoXCI8b3B0aW9uIGNsYXNzPVxcXCJ3YXZlZm9ybS10b29sYmFyLW9wdGlvblxcXCIgaWQ9XFxcIiN7QF9yYWRpeFNlbGVjdEJpbklkfVxcXCIgdmFsdWU9XFxcIiN7QF9yYWRpeFNlbGVjdEJpbklkfVxcXCIgc2VsZWN0ZWQ+QmluYXJ5PC9vcHRpb24+XCIpXG5cdFx0QF9yYWRpeFNlbGVjdERlY0lkID0gXCIje0BfY29udGFpbmVySWR9LXdhdmVmb3JtLXJhZGl4LWRlY1wiXG5cdFx0QF9vcHRpb25EZWMgPSAkKFwiPG9wdGlvbiBjbGFzcz1cXFwid2F2ZWZvcm0tdG9vbGJhci1vcHRpb25cXFwiIGlkPVxcXCIje0BfcmFkaXhTZWxlY3REZWNJZH1cXFwiIHZhbHVlPVxcXCIje0BfcmFkaXhTZWxlY3REZWNJZH1cXFwiPkRlY2ltYWw8L29wdGlvbj5cIilcblx0XHRAX3JhZGl4U2VsZWN0SGV4SWQgPSBcIiN7QF9jb250YWluZXJJZH0td2F2ZWZvcm0tcmFkaXgtaGV4XCJcblx0XHRAX29wdGlvbkhleCA9ICQoXCI8b3B0aW9uIGNsYXNzPVxcXCJ3YXZlZm9ybS10b29sYmFyLW9wdGlvblxcXCIgaWQ9XFxcIiN7QF9yYWRpeFNlbGVjdEhleElkfVxcXCIgdmFsdWU9XFxcIiN7QF9yYWRpeFNlbGVjdEhleElkfVxcXCI+SGV4YWRlY2ltYWw8L29wdGlvbj5cIilcblx0XHRAX3JhZGl4U2VsZWN0SWQgPSBcIiN7QF9jb250YWluZXJJZH0td2F2ZWZvcm0tcmFkaXgtc2VsZWN0XCJcblx0XHRAX3JhZGl4U2VsZWN0TGFiZWxJZCA9IFwiI3tAX2NvbnRhaW5lcklkfS13YXZlZm9ybS1yYWRpeC1zZWxlY3QtbGFiZWxcIlxuXHRcdEBfcmFkaXhTZWxlY3RMYWJlbCA9ICQoXCI8bGFiZWwgY2xhc3M9XFxcIndhdmVmb3JtLXRvb2xiYXItbGFiZWxcXFwiIGlkPVxcXCIje0BfcmFkaXhTZWxlY3RMYWJlbElkfVxcXCIgZm9yPVxcXCIje0BfcmFkaXhTZWxlY3RJZH1cXFwiPlNlbGVjdCBhIHNwZWVkPC9sYWJlbD5cIilcblx0XHRAX3JhZGl4U2VsZWN0ID0gJChcIjxzZWxlY3QgY2xhc3M9XFxcIndhdmVmb3JtLXRvb2xiYXItc2VsZWN0XFxcIiBuYW1lPVxcXCJyYWRpeC1zZWxlY3RcXFwiIGlkPVxcXCIje0BfcmFkaXhTZWxlY3RJZH1cXFwiPjwvc2VsZWN0PlwiKVxuXG5cdFx0QF9jdXJzb3JWYWx1ZUlkID0gXCIje0BfY29udGFpbmVySWR9LXdhdmVmb3JtLXRvb2xiYXItY3Vyc29yLXZhbHVlXCJcblx0XHRAX2N1cnNvclZhbHVlRGl2ID0gJChcIjxkaXYgaWQ9XFxcIiN7QF9jdXJzb3JWYWx1ZUlkfVxcXCIgY2xhc3M9XFxcImN1cnNvci10b29sYmFyLXZhbHVlXFxcIj5DdXJzb3I6IDBuczwvZGl2PlwiKVxuXG5cdFx0QF9tb2RhbERpYWxvZ0lkID0gXCIje0BfY29udGFpbmVySWR9LXdhdmVmb3JtLW1vZGFsXCJcblx0XHRAX21vZGFsRGlhbG9nID0gJChcIjxkaXYgaWQ9XFxcIiN7QF9tb2RhbERpYWxvZ0lkfVxcXCI+PC9kaXY+XCIpXG5cblx0XHRAX3Rvb2xiYXJkSWQgPSBcIiN7QF9jb250YWluZXJJZH0td2F2ZWZvcm0tdG9vbGJhclwiXG5cdFx0QF93YXZlZm9ybVRvb2xiYXIgPSAkKFwiPGRpdiBpZD1cXFwiI3tAX3Rvb2xiYXJkSWR9XFxcIiBjbGFzcz1cXFwidWktd2lkZ2V0LWhlYWRlciB1aS1jb3JuZXItYWxsIHdhdmVmb3JtLXRvb2xiYXJcXFwiPjwvZGl2PlwiKVxuXG5cdFx0QF93YXZlZm9ybVRvb2xiYXIuYXBwZW5kIEBfYWRkU2lnbmFsQnV0dG9uXG5cdFx0QF93YXZlZm9ybVRvb2xiYXIuYXBwZW5kIEBfcmVtb3ZlU2lnbmFsQnV0dG9uXG5cdFx0QF93YXZlZm9ybVRvb2xiYXIuYXBwZW5kIEBfem9vbUluQnV0dG9uXG5cdFx0QF93YXZlZm9ybVRvb2xiYXIuYXBwZW5kIEBfem9vbU91dEJ1dHRvblxuXHRcdEBfd2F2ZWZvcm1Ub29sYmFyLmFwcGVuZCBAX3pvb21BbGxCdXR0b25cblx0XHRAX3dhdmVmb3JtVG9vbGJhci5hcHBlbmQgQF9nb3RvRmlyc3RCdXR0b25cblx0XHRAX3dhdmVmb3JtVG9vbGJhci5hcHBlbmQgQF9nb0xlZnRCdXR0b25cblx0XHRAX3dhdmVmb3JtVG9vbGJhci5hcHBlbmQgQF9nb1JpZ2h0QnV0dG9uXG5cdFx0QF93YXZlZm9ybVRvb2xiYXIuYXBwZW5kIEBfcmVzZXRCdXR0b25cblxuXHRcdEBfcmFkaXhTZWxlY3QuYXBwZW5kIEBfb3B0aW9uQmluXG5cdFx0QF9yYWRpeFNlbGVjdC5hcHBlbmQgQF9vcHRpb25EZWNcblx0XHRAX3JhZGl4U2VsZWN0LmFwcGVuZCBAX29wdGlvbkhleFxuXG5cdFx0QF93YXZlZm9ybVRvb2xiYXIuYXBwZW5kIEBfcmFkaXhTZWxlY3Rcblx0XHRAX3dhdmVmb3JtVG9vbGJhci5hcHBlbmQgQF9jdXJzb3JWYWx1ZURpdlxuXHRcdEBfY3Vyc29yVmFsdWVEaXYuaGlkZSgpXG5cblx0XHRAX2NvbnRhaW5lci5hcHBlbmQgQF93YXZlZm9ybVRvb2xiYXJcblx0XHRAX2NvbnRhaW5lci5hcHBlbmQgQF9tb2RhbERpYWxvZ1xuXG5cdFx0QF9jYW52YXNJZCA9IFwiI3tAX2NvbnRhaW5lcklkfS13YXZlZm9ybS1jYW52YXNcIlxuXHRcdEBfY2FudmFzV3JhcHBlciA9ICQoXCI8Y2FudmFzIGNsYXNzPVxcXCJ3YXZlZm9ybS1jYW52YXNcXFwiIGlkPVxcXCIje0BfY2FudmFzSWR9XFxcIj48L2NhbnZhcz5cIilcblxuXG5cblx0XHRAX2NhbnZhc1ZpZXdwb3J0SWQgPSBcIiN7QF9jb250YWluZXJJZH0td2F2ZWZvcm0tY2FudmFzLXZpZXdwb3J0XCJcblx0XHRAX2NhbnZhc1ZpZXdwb3J0ID0gJChcIjxkaXYgY2xhc3M9XFxcImNhbnZhcy12aWV3cG9ydFxcXCIgaWQ9XFxcIiN7QF9jYW52YXNWaWV3cG9ydElkfVxcXCI+PC9kaXY+XCIpXG5cblxuXG5cdFx0QF9jYW52YXNWaWV3cG9ydC5hcHBlbmQgQF9jYW52YXNXcmFwcGVyXG5cblx0XHRAX2NvbnRhaW5lci5hcHBlbmQgQF9jYW52YXNWaWV3cG9ydFxuXHRcdEBjYW52YXNIZWlnaHQgPSBDQU5WQVNfTUFYX0hFSUdIVFxuXHRcdEBjYW52YXNXaWR0aCA9IEBfY29udGFpbmVyLndpZHRoKClcblx0XHRAdmlld3BvcnRIZWlnaHQgPSBAX2NvbnRhaW5lci5oZWlnaHQoKVxuXHRcdEBjYW52YXNIZWlnaHQgPSBDQU5WQVNfTUFYX0hFSUdIVFxuXG5cblx0XHRAX2NhbnZhc1ZpZXdwb3J0LmF0dHIgJ3RhYkluZGV4JywgMTAwMFxuXG5cdFx0JChcIiMje0BfY2FudmFzVmlld3BvcnRJZH1cIikua2V5ZG93biAoZSk9PlxuXHRcdFx0aWYgZS5rZXlDb2RlIGlzIDM4XG5cdFx0XHRcdGlmIEBoaWdobGlnaHRlZFxuXHRcdFx0XHRcdEBoaWdobGlnaHRlZC5maWxsID0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0QGhpZ2hsaWdodGVkLm9wYWNpdHkgPSAwXG5cdFx0XHRcdEBoaWdobGlnaHRlZEluZGV4LS1cblx0XHRcdFx0QGhpZ2hsaWdodGVkSW5kZXggPSBAcmVuZGVyZWRTaWduYWxzLmxlbmd0aCAtIDEgaWYgQGhpZ2hsaWdodGVkSW5kZXggPCAwXG5cdFx0XHRcdEBoaWdobGlnaHRlZCA9IEByZW5kZXJlZFNpZ25hbHNbQGhpZ2hsaWdodGVkSW5kZXhdLmhpZ2hsaWdodFxuXHRcdFx0XHRAaGlnaGxpZ2h0ZWQuZmlsbCA9IERFRkFVTFRfQ09MT1IuU0lHTkFMX0hJR0hMSUdIVFxuXHRcdFx0XHRAaGlnaGxpZ2h0ZWQub3BhY2l0eSA9IERFRkFVTFRfT1BBQ0lUWS5TSUdOQUxfSElHSExJR0hUXG5cdFx0XHRcdEBfY2FudmFzLnJlbmRlckFsbCgpXG5cdFx0XHRcdEBzZXRDdXJzb3JUaW1lIEBjdXJyZW50RXhhY3RUaW1lXG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKVxuXHRcdFx0ZWxzZSBpZiBlLmtleUNvZGUgaXMgNDBcblx0XHRcdFx0aWYgQGhpZ2hsaWdodGVkXG5cdFx0XHRcdFx0QGhpZ2hsaWdodGVkLmZpbGwgPSB1bmRlZmluZWRcblx0XHRcdFx0XHRAaGlnaGxpZ2h0ZWQub3BhY2l0eSA9IDBcblx0XHRcdFx0QGhpZ2hsaWdodGVkSW5kZXgrK1xuXHRcdFx0XHRAaGlnaGxpZ2h0ZWRJbmRleCA9IDAgaWYgQGhpZ2hsaWdodGVkSW5kZXggPj0gQHJlbmRlcmVkU2lnbmFscy5sZW5ndGhcblx0XHRcdFx0QGhpZ2hsaWdodGVkID0gQHJlbmRlcmVkU2lnbmFsc1tAaGlnaGxpZ2h0ZWRJbmRleF0uaGlnaGxpZ2h0XG5cdFx0XHRcdEBoaWdobGlnaHRlZC5maWxsID0gREVGQVVMVF9DT0xPUi5TSUdOQUxfSElHSExJR0hUXG5cdFx0XHRcdEBoaWdobGlnaHRlZC5vcGFjaXR5ID0gREVGQVVMVF9PUEFDSVRZLlNJR05BTF9ISUdITElHSFRcblx0XHRcdFx0QF9jYW52YXMucmVuZGVyQWxsKClcblx0XHRcdFx0QHNldEN1cnNvclRpbWUgQGN1cnJlbnRFeGFjdFRpbWVcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0XHRlbHNlIGlmIGUuY3RybEtleSBhbmQgZS5rZXlDb2RlIGlzIDgzXG5cdFx0XHRcdGlmIEBfb25TYXZlTGlzdGVuZXJcblx0XHRcdFx0XHRAX29uU2F2ZUxpc3RlbmVyIEBleHBvcnRUaW1pbmdEaWFncmFtKClcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cblxuXHRcdEBfYWRkU2lnbmFsQnV0dG9uLmJ1dHRvblxuXHRcdFx0dGV4dDogbm9cblx0XHRcdGljb25zOlxuXHRcdFx0XHRwcmltYXJ5OiAndWktaWNvbi1wbHVzJ1xuXHRcdEBfYWRkU2lnbmFsQnV0dG9uLmNsaWNrIChlKSA9PlxuXHRcdFx0QGFkZFNpZ25hbCgpXG5cblx0XHRAX3JlbW92ZVNpZ25hbEJ1dHRvbi5idXR0b25cblx0XHRcdHRleHQ6IG5vXG5cdFx0XHRpY29uczpcblx0XHRcdFx0cHJpbWFyeTogJ3VpLWljb24tbWludXMnXG5cdFx0QF9yZW1vdmVTaWduYWxCdXR0b24uY2xpY2sgKGUpID0+XG5cdFx0XHRAcmVtb3ZlU2lnbmFsKClcblxuXHRcdEBfem9vbUluQnV0dG9uLmJ1dHRvblxuXHRcdFx0dGV4dDogbm9cblx0XHRcdGljb25zOlxuXHRcdFx0XHRwcmltYXJ5OiAndWktaWNvbi16b29taW4nXG5cdFx0QF96b29tSW5CdXR0b24uY2xpY2sgKGUpID0+XG5cdFx0XHRAem9vbUluKClcblxuXHRcdEBfem9vbU91dEJ1dHRvbi5idXR0b25cblx0XHRcdHRleHQ6IG5vXG5cdFx0XHRpY29uczpcblx0XHRcdFx0cHJpbWFyeTogJ3VpLWljb24tem9vbW91dCdcblx0XHRAX3pvb21PdXRCdXR0b24uY2xpY2sgKGUpID0+XG5cdFx0XHRAem9vbU91dCgpXG5cblx0XHRAX3pvb21BbGxCdXR0b24uYnV0dG9uXG5cdFx0XHR0ZXh0OiBub1xuXHRcdFx0aWNvbnM6XG5cdFx0XHRcdHByaW1hcnk6ICd1aS1pY29uLWFycm93LTQtZGlhZydcblx0XHRAX3pvb21BbGxCdXR0b24uY2xpY2sgKGUpID0+XG5cdFx0XHRAem9vbUFsbCgpXG5cblx0XHRAX2dvdG9GaXJzdEJ1dHRvbi5idXR0b25cblx0XHRcdHRleHQ6IG5vXG5cdFx0XHRpY29uczpcblx0XHRcdFx0cHJpbWFyeTogJ3VpLWljb24tYXJyb3dzdG9wLTEtdydcblx0XHRAX2dvdG9GaXJzdEJ1dHRvbi5jbGljayAoZSkgPT5cblx0XHRcdEBtb3ZlRmlyc3QoKVxuXG5cdFx0QF9nb0xlZnRCdXR0b24uYnV0dG9uXG5cdFx0XHR0ZXh0OiBub1xuXHRcdFx0aWNvbnM6XG5cdFx0XHRcdHByaW1hcnk6ICd1aS1pY29uLXRyaWFuZ2xlLTEtdydcblx0XHRAX2dvTGVmdEJ1dHRvbi5jbGljayAoZSkgPT5cblx0XHRcdEBtb3ZlTGVmdCgpXG5cblx0XHRAX2dvUmlnaHRCdXR0b24uYnV0dG9uXG5cdFx0XHR0ZXh0OiBub1xuXHRcdFx0aWNvbnM6XG5cdFx0XHRcdHByaW1hcnk6ICd1aS1pY29uLXRyaWFuZ2xlLTEtZSdcblx0XHRAX2dvUmlnaHRCdXR0b24uY2xpY2sgKGUpID0+XG5cdFx0XHRAbW92ZVJpZ2h0KClcblxuXHRcdEBfcmVzZXRCdXR0b24uYnV0dG9uXG5cdFx0XHR0ZXh0OiBub1xuXHRcdFx0aWNvbnM6XG5cdFx0XHRcdHByaW1hcnk6ICd1aS1pY29uLWFycm93cmVmcmVzaC0xLW4nXG5cdFx0QF9yZXNldEJ1dHRvbi5jbGljayAoZSkgPT5cblx0XHRcdEByZXNldFRpbWluZ0RpYWdyYW0oKVxuXG5cdFx0QF9yYWRpeFNlbGVjdC5zZWxlY3RtZW51KClcblxuXHRcdCQoXCIjI3tAX2NvbnRhaW5lcklkfS13YXZlZm9ybS1yYWRpeC1zZWxlY3QtYnV0dG9uXCIpLmNzcygnZGlzcGxheScsICdpbmxpbmUtdGFibGUnKVxuXHRcdCQoXCIjI3tAX2NvbnRhaW5lcklkfS13YXZlZm9ybS1yYWRpeC1zZWxlY3QtYnV0dG9uXCIpLmZpbmQoJy51aS1zZWxlY3RtZW51LXRleHQnKS5jc3MoJ2xpbmUtaGVpZ2h0JywgJzAuNicpXG5cblx0XHRAX3JhZGl4U2VsZWN0Lm9uIFwic2VsZWN0bWVudWNoYW5nZVwiLCAodWksIGUpID0+XG5cdFx0XHRzZWxlY3RlZFJhZGl4SWQgPSBlLml0ZW0udmFsdWVcblx0XHRcdGlmIHNlbGVjdGVkUmFkaXhJZCBpcyBAX3JhZGl4U2VsZWN0QmluSWRcblx0XHRcdFx0QHNldFJhZGl4IFJBRElYX0JJTlxuXHRcdFx0ZWxzZSBpZiBzZWxlY3RlZFJhZGl4SWQgaXMgQF9yYWRpeFNlbGVjdERlY0lkXG5cdFx0XHRcdEBzZXRSYWRpeCBSQURJWF9ERUNcblx0XHRcdGVsc2UgaWYgc2VsZWN0ZWRSYWRpeElkIGlzIEBfcmFkaXhTZWxlY3RIZXhJZFxuXHRcdFx0XHRAc2V0UmFkaXggUkFESVhfSEVYXG4iXX0=
