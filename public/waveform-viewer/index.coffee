class Waveform
	'use strict'
	RULER_HEIGHT = 14
	GRID_SECTIONS = 11
	SIGNAL_NAMES_BOX_WIDTH = 280
	SIGNAL_NAME_WIDTH = 150
	SIGNAL_BOX_HEIGHT = 20
	SIGNAL_BOX_WIDTH = 160
	SIGNAL_BOX_PADDING = 8
	SIGNAL_HEIGHT = 20
	SIGNAL_BUS_SLOPE = 3

	WIRE_SIGNAL = 0
	BUS_SIGNAL = 1

	RADIX_BIN = 0
	RADIX_DEC = 1
	RADIX_HEX = 2

	CANVAS_MAX_HEIGHT = 3000

	DEFAULT_COLOR =
					CANVAS_BACKGROUND: 'black'
					CURSOR: 'rgb(64, 186, 255)'
					GRID_TEXT: 'gray'
					SIGNAL: 'rgb(8, 255, 40)'
					SIGNAL_NAME_RECT: 'gray'
					SIGNAL_HIGHLIGHT: 'rgb(97, 255, 0)'
					SIGNAL_DC: 'red'
					SIGNAL_IMPED: 'blue'
					SIGNAL_DRAGGED: 'rgb(197, 255, 145)'
					GRID_LINE: 'gray'
					SIGNAL_NAME: 'white'
					SIGNAL_VALUE: 'white'
					SIGNAL_CURRENT_VALUE: 'white'
					CURRENT_VALUE_LINE: 'white'

	DEFAULT_OPACITY =
					CURSOR: 1.0
					SIGNAL_NAME_RECT: 0.2
					SIGNAL_HIGHLIGHT: 0.3
					SIGNAL_DRAGGED: 0.3

	constructor: (@_containerId, @_data, @_initDiagram) ->
		@_container = $("##{@_containerId}")
		return null unless @_container.length
		return null unless @_data.signal?

		@_data.signal.sort (firstSignal, secondSignal) ->
			if firstSignal.name < secondSignal.name
				-1
			else if firstSignal.name > secondSignal.name
				1
			else
				0

		if typeof @_initDiagram is 'string'
			try
				@_initDiagram = JSON.parse @_initDiagram
			catch e
				@_initDiagram = null
		if @_initDiagram?
			signalNames = []
			for signal in @_data.signal
				signalNames.push signal.name
			layoutNames = []
			for signal in @_initDiagram.rendered
				layoutNames.push signal
			for signal in @_initDiagram.hidden
				layoutNames.push signal
			for signal in layoutNames
				unless signal in signalNames
					console.error 'Supplied layout is not compatible with the simulation.'
					@_initDiagram = null
					break

		@timeScale = @_data.scale.match /(\d+)/
		@timeScaleUnit = @_data.scale.match /(\D+)/
		return null if not @timeScale? or not @timeScaleUnit
		@timeScale = @timeScale[0]
		@timeScaleUnit = @timeScaleUnit[0]
		@timeUnit = parseInt @timeScale
		if @timeScaleUnit is 'ns'
			@timeUnit *= 1000

		@radix = RADIX_BIN

		@originalEndTime = @_data.endtime
		@endTime = @ceilFive @originalEndTime
		@renderFrom = 0
		if @originalEndTime > 100
			@renderTo = @floorInt @endTime, 100
		else
			@renderTo = @roundInt (@endTime / 2.0), 10
		@signals = @_data.signal

		@_onChangeListener = undefined
		@_onSaveListener = undefined

		if @_initDiagram?
			if @_initDiagram.from?
				@renderFrom = @_initDiagram.from
			if @_initDiagram.to?
				@renderTo = @_initDiagram.to
			if @_initDiagram.end?
				@endTime = @_initDiagram.end
			if @_initDiagram.originalEnd?
				@originalEndTime = @_initDiagram.originalEnd
			if @_initDiagram.timeScale?
				@timeScale = @_initDiagram.timeScale
			if @_initDiagram.timeScaleUnit?
				@timeScale = @_initDiagram.timeScaleUnit
			if @_initDiagram.timeUnit?
				@timeUnit = @_initDiagram.timeUnit
			if @_initDiagram.cursor? and @_initDiagram.cursorExact?
				@currentTime = @_initDiagram.cursor
				@currentExactTime = @_initDiagram.cursorExact

		for signal in @signals
			signal.originalName = signal.name
		unless @_initDiagram?
			@renderedSignals = []
			@removedSignals = []
			@includedSignals = []
			@excludedSignals = []
			for signal in @signals
				continue unless typeof signal.name is 'string' or signal.name.trim() is ''
				levels = signal.name.split '.'
				depth = levels.length
				signalId = signal.name
				if depth > 1
					levels.splice 0, 1
				signal.name = levels.join '.'
				busSignal = @isBus signal.name
				if depth is 2
					unless signalId in @includedSignals
						@renderedSignals.push
							id: signalId
							signal: signal
							text: null
							ypos: null
							currentValue: '0'
							type: if busSignal then BUS_SIGNAL else WIRE_SIGNAL
							width: if busSignal then Math.abs(busSignal.start - busSignal.end) + 1 else 1
						@includedSignals.push signalId
				else if depth > 2
					unless signalId in @excludedSignals
						@removedSignals.push
							id: signalId
							signal: signal
							text: null
							ypos: null
							currentValue: '0'
							type: if busSignal then BUS_SIGNAL else WIRE_SIGNAL
							width: if busSignal then Math.abs(busSignal.start - busSignal.end) + 1 else 1
						@excludedSignals.push signalId
		else
			signalMap = {}
			@renderedSignals = []
			@removedSignals = []
			@includedSignals = []
			@excludedSignals = []
			for index in @_initDiagram.rendered
				@includedSignals.push index unless index in @includedSignals
			for index in @_initDiagram.hidden
				@excludedSignals.push index unless index in @excludedSignals
			@_initDiagram.rendered = (index for index in @includedSignals)
			@_initDiagram.hidden = (index for index in @excludedSignals)

			for signal in @signals
				continue unless typeof signal.name is 'string' or signal.name.trim() is ''
				levels = signal.name.split '.'
				depth = levels.length
				signalId = signal.name
				if depth > 1
					levels.splice 0, 1
				signal.name = levels.join '.'
				busSignal = @isBus signal.name
				signalMap[signalId] =
							id: signalId
							signal: signal
							text: null
							ypos: null
							currentValue: '0'
							type: if busSignal then BUS_SIGNAL else WIRE_SIGNAL
							width: if busSignal then Math.abs(busSignal.start - busSignal.end) + 1 else 1
			@renderedSignals.push signalMap[signalIndex] for signalIndex in @_initDiagram.rendered
			@removedSignals.push signalMap[signalIndex] for signalIndex in @_initDiagram.hidden
			if typeof @_initDiagram.highlightedIndex is 'number' and @_initDiagram.highlightedIndex < @renderedSignals.length
				@highlightedIndex = @_initDiagram.highlightedIndex


		@_initLayout()
		@_initCanvas()
		@redraw()
		if @_initDiagram? and @_initDiagram.cursor? and @_initDiagram.cursorExact?
			@setCursorTime @currentExactTime
		if @_initDiagram? and @_initDiagram.radix?
			if @_initDiagram.radix is RADIX_BIN
				$("##{@_radixSelectId}").val("#{@_radixSelectBinId}").selectmenu('refresh')
				@radix = RADIX_BIN
				@setRadix RADIX_BIN
			else if @_initDiagram.radix is RADIX_HEX
				$("##{@_radixSelectId}").val("#{@_radixSelectHexId}").selectmenu('refresh')
				@radix = RADIX_HEX
				@setRadix RADIX_HEX
			else if @_initDiagram.radix is RADIX_DEC
				$("##{@_radixSelectId}").val("#{@_radixSelectDecId}").selectmenu('refresh')
				@radix = RADIX_DEC
				@setRadix RADIX_DEC
			@redraw()

	setOnChangeListener: (listener) ->
		if typeof listener is 'function'
			@_onChangeListener = listener

	setOnSaveListener: (listener) ->
		if typeof listener is 'function'
			@_onSaveListener = listener

	exportTimingDiagram: ->
		renderedOrder =
			(for signal in @renderedSignals
				signal.id)
		hiddenOrder =
			(for signal in @removedSignals
				signal.id)
		exported =
			rendered: renderedOrder
			hidden: hiddenOrder
			from: @renderFrom
			to: @renderTo
			cursor: @currentTime
			cursorExact: @currentExactTime
			end: @endTime
			originalEnd: @originalEndTime
			radix: @radix
			timeScale: @timeScale
			timeScaleUnit: @timeScaleUnit
			timeUnit: @timeUnit
			highlightedIndex: @highlightedIndex
		JSON.stringify exported

	resetTimingDiagram: ->
		@timeScale = @_data.scale.match /(\d+)/
		@timeScaleUnit = @_data.scale.match /(\D+)/
		return null if not @timeScale? or not @timeScaleUnit
		@timeScale = @timeScale[0]
		@timeScaleUnit = @timeScaleUnit[0]
		@timeUnit = parseInt @timeScale
		if @timeScaleUnit is 'ns'
			@timeUnit *= 1000

		@radix = RADIX_BIN

		@originalEndTime = @_data.endtime
		@endTime = @ceilFive @originalEndTime
		@renderFrom = 0
		if @originalEndTime > 100
			@renderTo = @floorInt @endTime, 100
		else
			@renderTo = @roundInt (@endTime / 2.0), 10

		for signal in @signals
			signal.name = signal.originalName

		@_data.signal.sort (firstSignal, secondSignal) ->
			if firstSignal.name < secondSignal.name
				-1
			else if firstSignal.name > secondSignal.name
				1
			else
				0

		@signals = @_data.signal

		@renderedSignals = []
		@removedSignals = []
		@includedSignals = []
		@excludedSignals = []
		for signal in @signals
			continue unless typeof signal.name is 'string' or signal.name.trim() is ''
			levels = signal.name.split '.'
			depth = levels.length
			signalId = signal.name
			if depth > 1
				levels.splice 0, 1
			signal.name = levels.join '.'
			busSignal = @isBus signal.name
			if depth is 2
				unless signalId in @includedSignals
					@renderedSignals.push
						id: signalId
						signal: signal
						text: null
						ypos: null
						currentValue: '0'
						type: if busSignal then BUS_SIGNAL else WIRE_SIGNAL
						width: if busSignal then Math.abs(busSignal.start - busSignal.end) + 1 else 1
					@includedSignals.push signalId
			else if depth > 2
				unless signalId in @excludedSignals
					@removedSignals.push
						id: signalId
						signal: signal
						text: null
						ypos: null
						currentValue: '0'
						type: if busSignal then BUS_SIGNAL else WIRE_SIGNAL
						width: if busSignal then Math.abs(busSignal.start - busSignal.end) + 1 else 1
					@excludedSignals.push signalId


		@currentTime = undefined
		@currentExactTime = undefined

		@highlightedIndex = undefined

		@redraw()
		if @_cursor
			@_cursor.setVisible no
			@_cursor.time = undefined

			@refreshCurrentValues()
			@_cursorValueDiv.text ''

		$("##{@_radixSelectId}").val("#{@_radixSelectBinId}").selectmenu('refresh')
		@setRadix RADIX_BIN

		if @_onChangeListener
			@_onChangeListener
						type: 'reset'

	redraw: ->
		if @renderTo > @endTime
			@renderTo = @endTime
		@clearCanvas()
		@drawGrid(@renderFrom, @renderTo)
		@drawSignals(@renderFrom, @renderTo)
		if @_cursor
			@_canvas.add @_cursor
		if @highlighted
			@highlighted.fill = undefined
			@highlighted.opacity = 0
		if @highlightedIndex
			@highlighted = @renderedSignals[@highlightedIndex].highlight
			@highlighted.fill = DEFAULT_COLOR.SIGNAL_HIGHLIGHT
			@highlighted.opacity = DEFAULT_OPACITY.SIGNAL_HIGHLIGHT
		@setCursorTime @currentExactTime

	setCursorTime: (exactTime) ->
		return unless exactTime?
		time = exactTime.toFixed(2)
		cursorPos = @_timeToPos exactTime, null, no

		@currentTime = time
		@currentExactTime = exactTime

		if @_cursor?
			@_cursor.x1 = cursorPos
			@_cursor.x2 = cursorPos
			@_cursor.setLeft cursorPos
			@_cursor.setTop 0
			@_cursor.setHeight @canvasHeight
			@_cursor.width = 1
		else
			@_cursor = new fabric.Line [cursorPos, 0, cursorPos, @canvasHeight],
										fill: DEFAULT_COLOR.CURSOR
										stroke: DEFAULT_COLOR.CURSOR
										strokeWidth: 1
										opacity: DEFAULT_OPACITY.CURSOR
										selectable: no
										hasControls: no
										hasRotatingPoint: no
										width: 1
			@_cursorValueDiv.show()
		if time < @renderFrom or time > @renderTo
			@_cursor.setVisible no
		else
			@_cursor.setVisible yes

		unless @_canvas.contains @_cursor
			@_canvas.add @_cursor
		@_cursor.time = @currentTime

		@refreshCurrentValues()
		cursorCurrentValueText = 'Time: ' + @currentTime + @timeScaleUnit
		if @highlighted
			cursorCurrentValueText = cursorCurrentValueText + ', Value: ' + @_getFormattedValue(@highlighted.signal.currentValue, @highlighted.signal.width)
		@_cursorValueDiv.text cursorCurrentValueText
		if @_onChangeListener
			@_onChangeListener
						type: 'cursor'
		@_canvas.renderAll()


	drawGrid: (start = @renderFrom, end = @renderTo)->
		@_signalsNamesRect = new fabric.Rect
			width: SIGNAL_NAMES_BOX_WIDTH
			height: @_canvas.height
			fill: DEFAULT_COLOR.SIGNAL_NAME_RECT
			opacity: DEFAULT_OPACITY.SIGNAL_NAME_RECT


		@_renderDist = Math.abs @renderTo - @renderFrom
		lineStep = Math.floor(@_renderDist / (GRID_SECTIONS - 1))

		i = @renderFrom + lineStep
		while i <= @renderTo
			i += lineStep
		currentTarget = i - lineStep

		i = @renderFrom + lineStep
		@_renderDistanceFactor = (@_canvas.width - SIGNAL_NAMES_BOX_WIDTH) / @_renderDist

		@_gridLines = []
		@_gridTexts = []
		while i <= currentTarget
			linePos = @_timeToPos(i)
			lineCords = [linePos, RULER_HEIGHT, linePos, @_canvas.height]
			@_gridLines.push @_getGridLine lineCords
			@_gridTexts.push new fabric.Text i + @timeScaleUnit,
															fontFamily: 'monospace'
															left: linePos - 10
															top: 0
															fontSize: 11
															selectable: no
															hasControls: no
															hasRotatingPoint: no
															fill: DEFAULT_COLOR.GRID_TEXT
			i += lineStep

		for line in @_gridLines
			@_canvas.add line
		for text in @_gridTexts
			@_canvas.add text


	refreshSignalValues: ->
		for val in @_signalValueText
			val.textbox.setText @_getFormattedValue val.value, val.width
		@_canvas.renderAll()

	drawSignals: (start = @renderFrom, end = @renderTo) ->
		@_drawSignalNames()
		signalIndex = -1
		@_signalValueText = []
		for rendered in @renderedSignals
			signalIndex++
			signal = rendered.signal
			ranges = @_getSignalValues(signal.wave, start, end)

			signalBus = @isBus signal.name


			initialValue = ranges[0].value

			originX = SIGNAL_NAMES_BOX_WIDTH
			originY = rendered.ypos
			if initialValue is '0' or initialValue is 'x' or initialValue is 'z'
				originY += SIGNAL_HEIGHT

			if signalBus
				originY = rendered.ypos + SIGNAL_HEIGHT / 2.0

			valueIndex = 0

			for valueObject in ranges
				valueObject.width = rendered.width
				if valueIndex is ranges.length - 1
					valueObject.last = yes
				[originX, originY, initialValue] = @_drawValue valueObject, originX, originY, initialValue, DEFAULT_COLOR.SIGNAL, (signalBus isnt no)
				valueIndex++

			highlightRect = new fabric.Rect
										left: 2
										top: rendered.ypos - 1
										height: SIGNAL_HEIGHT + 3
										width: @canvasWidth
										fill: undefined
										opacity: 0
										selectable: no
										hasControls: no
										hasRotatingPoint: no

			highlightRect.signal = rendered
			rendered.highlight = highlightRect
			rendered.currentValue = ranges[0].value
			currentValueText = @_getFormattedValue(ranges[0].value, ranges[0].width)
			@_signalCurrentValues[signalIndex].setText currentValueText
			currentValueWidth = @_signalCurrentValues[signalIndex].width
			currentValueSpanWidth = Math.abs(SIGNAL_NAMES_BOX_WIDTH - SIGNAL_BOX_WIDTH - 10)
			overflowWidth = currentValueWidth > currentValueSpanWidth
			while currentValueWidth > currentValueSpanWidth
				currentValueText = currentValueText.substr 0, currentValueText.length - 1
				@_signalCurrentValues[signalIndex].setText currentValueText
				currentValueWidth = @_signalCurrentValues[signalIndex].width
			if overflowWidth
				currentValueWidth = currentValueWidth + '..'
			@_canvas.add @_signalCurrentValues[signalIndex]
			@_canvas.add highlightRect

		@_canvas.bringToFront @_currentValueLineStart
		@_canvas.bringToFront @_currentValueLineEnd
		@_canvas.renderAll()

	refreshCurrentValues: ->
		signalIndex = 0
		for rendered in @renderedSignals
			signal = rendered.signal
			wave = signal.wave
			ind = 0
			for value in wave
				if @currentTime >= Number.parseInt value[0]
					if ind is wave.length - 1 or @currentTime <= Number.parseInt wave[ind + 1]
						rendered.currentValue = value[1]
						break
				ind++
			currentValueText = @_getFormattedValue(rendered.currentValue, rendered.width)
			@_signalCurrentValues[signalIndex].setText currentValueText
			currentValueWidth = @_signalCurrentValues[signalIndex].width
			currentValueSpanWidth = Math.abs(SIGNAL_NAMES_BOX_WIDTH - SIGNAL_BOX_WIDTH - 14)
			overflowWidth = currentValueWidth > currentValueSpanWidth
			while currentValueWidth > currentValueSpanWidth
				currentValueText = currentValueText.substr 0, currentValueText.length - 1
				@_signalCurrentValues[signalIndex].setText currentValueText
				currentValueWidth = @_signalCurrentValues[signalIndex].width
			if overflowWidth
				currentValueWidth = currentValueWidth + '..'
			signalIndex++
		@_canvas.renderAll()


	addSignal: ->
		title = "Add Signals"
		console.log @removedSignals
		console.log @includedSignals
		console.log @excludedSignals
		@removedSignals.sort (firstSignal, secondSignal) ->
			if firstSignal.signal.name < secondSignal.signal.name
				-1
			else if firstSignal.signal.name > secondSignal.signal.name
				1
			else
				0

		signalTree = []
		isSignalAdded = {}
		parent = ''
		for removedSignal, index in @removedSignals
			singalName = removedSignal.signal.name
			signalParts = singalName.split '.'
			treeIt = signalTree.root
			path = ""
			id = path = parent = ""
			for part, lvl in signalParts
				if lvl is 0
					id = path = part
					parent = "#"
				else
					id = path + "." + part
					parent = path
					path = id
				signalObj =
					"id": id
					"parent": parent
					"text": part
					data:
						index: index
						level: lvl
						signalId: removedSignal.id
					"li_attr" :
						"class":"tree-item tree-file-item"
					type: 'node'
				if index is 0 and lvl is 0
					signalObj.state = opened: yes
				if lvl is signalParts.length - 1
					signalObj.type = 'leaf'
				unless isSignalAdded[id]?
					signalTree.push signalObj
					isSignalAdded[id] = 1


		selectableId = "#{@_containerId}-waveform-add-signal-select"
		dialogTitle = "Add Signals"
		dialogMessage = """
			<div class="dialog-input-group">
				<label for="filter">Filter: </label>
				<input type="text" name="filter" id="filter" value="">
			</div>
			<div>
				<div class="waveform-signal-tree" id=\"#{selectableId}\"></div>
			</div>"""
		$("##{@_modalDialogId}").html dialogMessage
		$("##{selectableId}").jstree(
			plugins:
				[
					'wholerow'
					'types'
					'unique'
					'search'
				]
			search:
				close_opened_onclear: no
				fuzzy: no
				case_insensitive: yes
				show_only_matches : yes
				show_only_matches_children: yes
			types:
					default:
						icon: '/images/tree-icons/Blank.png'
					'#':
						icon: '/images/tree-icons/Folder.png'
						valid_children: ['node']
					node:
						icon: '/images/tree-icons/SignalNode.png'
						valid_children: ['leaf']
					leaf:
						icon: '/images/tree-icons/SignalLeaf.png'
						valid_children: []
			core:
				themes:
					name: 'default-dark'
					dots: no
				multiple: yes
				check_callback: (operation, node, nodeParent, node_position, more) ->
					return yes
				data: signalTree
				).bind('dblclick.jstree', ((e) ->
					node = $(e.target).closest("li")
					if node.length
						nodeId = node.attr 'id'
						#if nodeId? and nodeId.trim() isnt ''
							#console.log nodeId
				)).bind('select_node.jstree', ((e, data) ->
					if not searchClearead
						$('#files').jstree(yes).search('')
						searchClearead = yes
				)).bind('keypress', ((e, data) ->
					#if e.keyCode is 127
						#deleteFile(no)
				))



		handleFilter = (e) =>
			filterValue = $("#filter").val().trim().toLowerCase()
			$("##{selectableId}").jstree(yes).search(filterValue)

		$("#filter").on 'input', handleFilter
		self = @
		alertify["addSignalDialog-#{selectableId}"] or alertify.dialog "addSignalDialog-#{selectableId}",(->
			main: (content) ->
				@setContent content
			prepare: ->
				confirmed = no
				ipId = ''
				ipName = ''
				ipTopModule = ''
				ipOwner = ''
				overwrite = no
				matchId = null
				wait = no
			setup: ->
					focus:
						element: '#filter'
						select: yes
					options:
						title: title
						maximizable: no
						resizable: no
						padding: yes
						closableByDimmer: no
						transition:'zoom'
					buttons:[
						{
							text: 'Add'
							key: 13
							className: alertify.defaults.theme.ok
							attrs:
								attribute:'value'
							scope:'auxiliary'
							element: undefined
						}
						{
							text: 'Cancel'
							invokeOnClose: yes
							className: alertify.defaults.theme.ok
							attrs:
								attribute:'value'
							scope:'auxiliary'
							element: undefined
						}
					]
			settings:
				callback: ->
			callback: (closeEvent) =>
						if closeEvent.index is 0
							selectionIds = $("##{selectableId}").jstree(yes).get_selected()
							rmIndices = []
							for id in selectionIds
								node = $("##{selectableId}").jstree(yes).get_node id
								continue unless node?
								nodeId = node.data.signalId
								selectedSignal = undefined
								selectionIndex = node.data.index
								for rs, ind in self.removedSignals
									if rs.id is nodeId
										selectedSignal = rs
										selectionIndex = ind
										break
								continue unless selectedSignal
								if node and node.type is 'leaf'
									selectionName = nodeId
									unless selectionName in self.includedSignals
										self.renderedSignals.push selectedSignal
										rmIndices.push selectionIndex
										self.excludedSignals.splice self.excludedSignals.indexOf selectionName, 1
										self.includedSignals.push selectionName

							rmIndices.sort()
							rmCounter = 0
							for ind in rmIndices
								self.removedSignals.splice ind - rmCounter, 1
								rmCounter++

							self.redraw()
							$("##{self._modalDialogId}").empty()

							if self._onChangeListener
								self._onChangeListener
											type: 'add'

			hooks:
				onclose: ->
					$("##{self._modalDialogId}").html('')
		), yes
		dialogInstance = alertify["addSignalDialog-#{selectableId}"]($("##{@_modalDialogId}").get(0)).set('title', title)


		return

		$("##{@_modalDialogId}").dialog
			resizable: yes
			modal: yes
			title: dialogTitle
			height: 400,
			width: 'auto',
			buttons:
				'Add': =>
					selectionIds = $("##{selectableId}").jstree(yes).get_selected()
					rmIndices = []
					for id in selectionIds
						node = $("##{selectableId}").jstree(yes).get_node id
						if node and node.type is 'leaf'
							selectionIndex = node.data.index
							selectionName = @removedSignals[selectionIndex].signal.name
							unless selectionName in @includedSignals
								@renderedSignals.push @removedSignals[selectionIndex]
								rmIndices.push selectionIndex
								@excludedSignals.splice @excludedSignals.indexOf selectionName, 1
								@includedSignals.push selectionName


					rmIndices.sort()
					rmCounter = 0
					for ind in rmIndices
						@removedSignals.splice ind - rmCounter, 1
						rmCounter++
					$("##{@_modalDialogId}").dialog('close')
					$("[aria-describedby=\"#{@_modalDialogId}\"]").remove()
					@redraw() if rmIndices.length
					$("##{@_modalDialogId}").empty()

					if @_onChangeListener
						@_onChangeListener
									type: 'add'
				'Cancel': ->
					$(@).dialog('close')
					$("[aria-describedby=\"#{@_modalDialogId}\"]").remove()
			close: =>
				$("##{@_modalDialogId}").empty()
				$("[aria-describedby=\"#{@_modalDialogId}\"]").remove()

	confirmationDialog = (title, htmlContent, cb, width = 350, height = 150) ->
		$("##{@_modalDialogId}").html htmlContent

		confirmed = no

		alertify.waveformConfirmationDialog or alertify.dialog 'waveformConfirmationDialog',(->
			main: (content) ->
				@setContent content
			prepare: ->
				confirmed = no
			setup: ->
					options:
						title: title
						maximizable: no
						resizable: no
						padding: yes
						closableByDimmer: no
						transition: 'zoom'
					buttons:[
						{
							text: 'OK'
							key: 13
							className: alertify.defaults.theme.ok
							attrs:
								attribute:'value'
							scope:'auxiliary'
							element: undefined
						}
						{
							text: 'Cancel'
							invokeOnClose: yes
							className: alertify.defaults.theme.ok
							attrs:
								attribute:'value'
							scope:'auxiliary'
							element: undefined
						}
					]
			callback: (closeEvent) ->
				if closeEvent.index is 0
					confirmed = yes
			settings:
				callback: ->
			hooks:
				onclose: ->
					$("##{@_modalDialogId}").html('')
					@settings.callback confirmed
		), yes
		alertify.waveformConfirmationDialog($("##{@_modalDialogId}").get(0)).set('title', title).set('callback', cb)

	removeSignal: ->
		return unless @highlighted
		signalIndex = @renderedSignals.indexOf @highlighted.signal
		signal = @highlighted.signal.signal
		signalName = signal.name
		dialogTitle = "Remove Signal #{signalName}?"
		dialogMessage = "<table><tbody><tr><td><i class=\"fa fa-exclamation-triangle fa-2x\" aria-hidden=\"true\" style=\"vertical-align: middle;\"></i></td><td style=\"padding-left: 1em;\"><p>Do you want to remove the selected signal?</p></td></tr></tbody></table>"
		confirmationDialog.bind(@) dialogTitle, dialogMessage, (confirmed) =>
			if confirmed
				if @highlighted
					@highlighted.fill = undefined
					@highlighted.opacity = 0
				@highlighted = undefined
				@highlightedIndex = undefined
				unless signalIndex in @excludedSignals
					@removedSignals.push @renderedSignals[signalIndex]
					@renderedSignals.splice signalIndex, 1
					@excludedSignals.push signalIndex
					@includedSignals.splice @includedSignals.indexOf signalIndex, 1
					@redraw()
				if @_onChangeListener
					@_onChangeListener
								type: 'remove'
		return
		$("##{@_modalDialogId}").html dialogMessage
		$("##{@_modalDialogId}").dialog
			resizable: no
			modal: yes
			title: dialogTitle
			height: 150,
			width: 320,
			buttons:
				'Remove': =>

				'Cancel': ->
					$(@).dialog('close')
					$("[aria-describedby=\"#{@_modalDialogId}\"]").remove()
			close: =>
				$("##{@_modalDialogId}").html ''

	moveFirst: ->
		return if @renderFrom is 0
		@renderFrom = 0
		@renderTo = @renderFrom + @_renderDist
		@renderTo = @endTime if @renderTo > @endTime
		@redraw()
		@setCursorTime @currentExactTime

	moveLeft: ->
		return if @renderFrom is 0
		factor = Math.floor @_renderDist / 8.0
		newFrom = @renderFrom - factor
		newFrom = 0 if newFrom < 0
		newTo = newFrom + @_renderDist
		newTo = @endTime if newTo > @endTime
		@renderFrom = newFrom
		@renderTo = newTo
		@redraw()
		@setCursorTime @currentExactTime

	moveRight: ->
		return if @renderTo is @endTime
		factor = Math.floor @_renderDist / 8.0
		newTo = @renderTo + factor
		newTo = @endTime if newTo > @endTime
		newFrom = newTo - @_renderDist
		newFrom = 0 if newFrom < 0
		@renderFrom = newFrom
		@renderTo = newTo
		@redraw()
		@setCursorTime @currentExactTime

	zoomIn: ->
		factor = Math.floor @_renderDist / 4.0
		newFrom = @renderFrom + factor
		newTo = @renderTo - factor
		if @_cursor?
			cursorTime = Math.round @_cursor.time
			if cursorTime - factor < @renderFrom
				newFrom = @renderFrom
				newTo = @renderTo - 2 * factor
			else if cursorTime + factor > @renderTo
				newFrom = @renderFrom + 2 * factor
				newTo = @renderTo
			else
				newFrom = cursorTime - factor
				newTo = cursorTime + factor

		return if newFrom > newTo or newTo < 0 or newFrom >= newTo
		newDistance = newTo - newFrom
		@scaleFactor = newDistance / @originalEndTime
		return if @scaleFactor < 0.02
		if factor
			@renderFrom = newFrom
			@renderTo = newTo
			@redraw()
			@setCursorTime @currentExactTime

	zoomOut: ->
		zoomDistance =  2 * @_renderDist
		newFrom = undefined
		newTo = undefined
		if zoomDistance > @originalEndTime
			newFrom = 0
			newTo = @endTime
		else
			factor = Math.floor @_renderDist / 2.0
			newFrom = @renderFrom - factor
			newTo = @renderTo + factor
			if newTo > @endTime
				newTo = @endTime
				newFrom = newTo - zoomDistance
			if newFrom < 0
				newFrom = 0

		newDistance = newTo - newFrom
		@scaleFactor = newDistance / @originalEndTime

		@renderFrom = newFrom
		@renderTo = newTo
		@redraw()
		@setCursorTime @currentExactTime

	zoomAll: ->
		return if @renderFrom is 0 and @renderTo is @endTime
		@renderFrom = 0
		@renderTo = @endTime
		@redraw()
		@setCursorTime @currentExactTime

	setRadix: (newRadix) ->
		return unless newRadix in [RADIX_BIN, RADIX_DEC, RADIX_HEX]
		changed = (@radix != newRadix)
		@radix = newRadix
		@refreshCurrentValues()
		@refreshSignalValues()
		if changed
		  @redraw()

	isBus: (signalName) ->
		matches = /[\s\S]+\[(\d+)\:(\d+)\]\s*/.exec signalName
		unless matches?
			no
		else
			start: matches[1]
			end: matches[2]

	clearCanvas: ->
		@_canvas.clear()

	binToDec: (value) ->
		Number.parseInt(value, 2).toString(10)

	binToHex: (value) ->
		Number.parseInt(value, 2).toString(16).toUpperCase()

	pad: (value, width, padding = '0') ->
		value = value + ''
		if value.length >= width then value else new Array(width - value.length + 1).join(padding) + value

	pointDist: (x1, y1, x2, y2) ->
		Math.sqrt Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)

	getRandomColor: ->
		letters = '0123456789ABCDEF'.split ''
		color = '#'
		for i in [0...6]
			color += letters[Math.floor(Math.random() * 16)]
		color


	ceilInt: (value, divis) ->
		value = Math.round value
		while value % divis
			value++
		value

	floorInt: (value, divis) ->
		value = Math.round value
		while value % divis
			value--
		value

	roundInt: (value,  divis) ->
		value = Math.round value
		return value unless value % divis
		ceilValue = value
		floorValue = value
		while ceilValue % divis and floorValue % divis
			ceilValue++
			floorValue--
		if ceilValue % divis then floorValue else ceilValue

	ceilFive: (value) ->
		@ceilInt value, 5

	floorFive: (value) ->
		@floorInt value, 5

	roundFive: (value) ->
		@roundInt value, 5

	_initCanvas: ->
		@_canvas = new fabric.Canvas @_canvasId,
												width: @canvasWidth
												height: @canvasHeight
												backgroundColor: DEFAULT_COLOR.CANVAS_BACKGROUND
												renderOnAddRemove: no
												selection: no
												stateful: no
		@_context = @_canvas.getContext '2d'
		@_isDragging = no
		@_draggedSignal = undefined
		@_draggedOriginalX = undefined
		@_draggedOriginalY = undefined
		@_draggedMouseX = undefined
		@_draggedMouseY = undefined
		@_dragRectangle = undefined
		@_dragRectangleOriginalHeight = undefined



		@_canvas.on 'mouse:down', (options) =>
			if options.target
				pointer = @_canvas.getPointer options.e
				if options.target.signal
					if @highlighted
						@highlighted.fill = undefined
						@highlighted.opacity = 0
					@highlighted = options.target
					@highlightedIndex = @renderedSignals.indexOf options.target.signal
					options.target.fill = DEFAULT_COLOR.SIGNAL_HIGHLIGHT
					options.target.opacity = DEFAULT_OPACITY.SIGNAL_HIGHLIGHT
				else
					if @highlighted
						@highlighted.fill = undefined
						@highlighted.opacity = 0
					@highlighted = undefined
					@highlightedIndex = undefined

				if options.target.signal
					@_draggedSignal = options.target
					@_draggedOriginalX = options.target.left
					@_draggedOriginalY = options.target.top
					@_draggedMouseX = pointer.x
					@_draggedMouseY = pointer.y
				@_isDragging = yes
				@_canvas.renderAll()
		@_canvas.on 'mouse:move', (options) =>
			if @_isDragging
				pointer = @._canvas.getPointer options.e
				if @_draggedSignal?
					@_draggedSignal.setTop (pointer.y - @_draggedMouseY) + @_draggedOriginalY
					@_draggedSignal.opacity = DEFAULT_OPACITY.SIGNAL_DRAGGED
				if @_dragRectangle? and options.target isnt @_dragRectangle
					@_dragRectangle.setHeight @_dragRectangleOriginalHeight
					@_dragRectangleOriginalHeight = undefined
					@_dragRectangle.fill = undefined
					@_dragRectangle.opacity = 0
					@_dragRectangle = undefined

				if options.target and options.target.signal and options.target isnt @_draggedSignal and options.target isnt @_dragRectangle
						@_dragRectangle = options.target
						@_dragRectangle.fill = DEFAULT_COLOR.SIGNAL_DRAGGED
						@_dragRectangle.opacity = DEFAULT_OPACITY.SIGNAL_DRAGGED
						@_dragRectangleOriginalHeight = @_dragRectangle.height
						@_dragRectangle.setHeight @_dragRectangle.height / 2.0
				@_canvas.renderAll()

		@_canvas.on 'mouse:up', (options) =>
			if @_isDragging
				validTarget = options.target and options.target.signal and @_draggedSignal isnt options.target
				if @_draggedSignal?
					if @_draggedOriginalX?
						if validTarget
							#Swap Signals
							sourceIndex = @renderedSignals.indexOf @_draggedSignal.signal
							targetIndex = @renderedSignals.indexOf options.target.signal
							@renderedSignals.splice(targetIndex, 0, @renderedSignals.splice(sourceIndex, 1)[0]);
							@_draggedSignal.set
												left: @_draggedOriginalX
												top: @_draggedOriginalY
							if @_dragRectangle?
								@_dragRectangle.setHeight @_dragRectangleOriginalHeight
								@_dragRectangle.fill = undefined
								@_dragRectangleOriginalHeight = undefined
								@_dragRectangle.opacity = 0
								@_dragRectangle = undefined
							@highlightedIndex = targetIndex
							@redraw()
							if @_onChangeListener
								@_onChangeListener
											type: 'sort'
						else
							@_draggedSignal.set
												left: @_draggedOriginalX
												top: @_draggedOriginalY

			if @_dragRectangle?
				@_dragRectangle.setHeight @_dragRectangleOriginalHeight
				@_dragRectangleOriginalHeight = undefined
				@_dragRectangle.fill = undefined
				@_dragRectangle.opacity = 0
				@_dragRectangle = undefined
			@_isDragging = no
			@_draggedSignal = undefined
			@_draggedOriginalX = undefined
			@_draggedOriginalY = undefined
			@_draggedMouseX = undefined
			@_draggedMouseY = undefined


			pointer = @_canvas.getPointer options.e
			if pointer.x > SIGNAL_NAMES_BOX_WIDTH
				@setCursorTime @_posToTime pointer.x, null, no

			@_canvas.renderAll()


	_drawValue: (valueObject, originX, originY, initialValue, signalColor = DEFAULT_COLOR.SIGNAL, busSignal = no, start = @renderFrom, end = @renderTo)->
		value = valueObject.value
		startPos = @_timeToPos(valueObject.start)
		endPos = @_timeToPos(valueObject.end)

		isLast = valueObject.last

		unless busSignal
			polyPoints = []
			lastPoint = []
			polyLine = undefined
			if initialValue is '0' or initialValue is 'x' or initialValue is 'z'
				if value is '1'
					polyPoints.push
							x: @_timeToPos(valueObject.start)
							y: originY
					polyPoints.push
							x: @_timeToPos(valueObject.start)
							y: originY - SIGNAL_HEIGHT
					polyPoints.push
							x: @_timeToPos(valueObject.end)
							y: originY - SIGNAL_HEIGHT

					lastPoint = [polyPoints[polyPoints.length - 1].x, polyPoints[polyPoints.length - 1].y]

					polyLine = new fabric.Polyline polyPoints,
												stroke: signalColor
												fill: undefined
												selectable: no
												hasControls: no
												hasRotatingPoint: no

					@_canvas.add polyLine

				else if value is '0'
					polyPoints.push
							x: @_timeToPos(valueObject.start)
							y: originY
					polyPoints.push
							x: @_timeToPos(valueObject.end)
							y: originY

					lastPoint = [polyPoints[polyPoints.length - 1].x, polyPoints[polyPoints.length - 1].y]
					polyLine = new fabric.Polyline polyPoints,
												stroke: signalColor
												fill: undefined
												selectable: no
												hasControls: no
												hasRotatingPoint: no

					@_canvas.add polyLine

				else if value is 'x'
					polyPoints.push
							x: @_timeToPos(valueObject.start)
							y: originY
					polyPoints.push
							x: @_timeToPos(valueObject.end)
							y: originY

					lastPoint = [polyPoints[polyPoints.length - 1].x, polyPoints[polyPoints.length - 1].y]
					polyLine = new fabric.Polyline polyPoints,
												stroke: DEFAULT_COLOR.SIGNAL_DC
												fill: undefined
												selectable: no
												hasControls: no
												hasRotatingPoint: no

					@_canvas.add polyLine
				else if value.toLowerCase() is 'z'
					polyPoints.push
							x: @_timeToPos(valueObject.start)
							y: originY
					polyPoints.push
							x: @_timeToPos(valueObject.end)
							y: originY

					lastPoint = [polyPoints[polyPoints.length - 1].x, polyPoints[polyPoints.length - 1].y]
					polyLine = new fabric.Polyline polyPoints,
												stroke: DEFAULT_COLOR.SIGNAL_IMPED
												fill: undefined
												selectable: no
												hasControls: no
												hasRotatingPoint: no

					@_canvas.add polyLine

			else if initialValue is '1'
				if value is '1'
					polyPoints.push
								x: @_timeToPos(valueObject.start)
								y: originY

					polyPoints.push
								x: @_timeToPos(valueObject.end)
								y: originY

					lastPoint = [polyPoints[polyPoints.length - 1].x, polyPoints[polyPoints.length - 1].y]
					polyLine = new fabric.Polyline polyPoints,
												stroke: signalColor
												fill: undefined
												selectable: no
												hasControls: no
												hasRotatingPoint: no

					@_canvas.add polyLine

				else if value is '0'
					polyPoints.push
							x: @_timeToPos(valueObject.start)
							y: originY
					polyPoints.push
							x: @_timeToPos(valueObject.start)
							y: originY + SIGNAL_HEIGHT
					polyPoints.push
							x: @_timeToPos(valueObject.end)
							y: originY + SIGNAL_HEIGHT

					lastPoint = [polyPoints[polyPoints.length - 1].x, polyPoints[polyPoints.length - 1].y]
					polyLine = new fabric.Polyline polyPoints,
												stroke: signalColor
												fill: undefined
												selectable: no
												hasControls: no
												hasRotatingPoint: no

					@_canvas.add polyLine

				else if value is 'x' or value.toLowerCase() is 'z'
					polyPoints.push
							x: @_timeToPos(valueObject.start)
							y: originY
					polyPoints.push
							x: @_timeToPos(valueObject.start)
							y: originY + SIGNAL_HEIGHT
					polyPoints.push
							x: @_timeToPos(valueObject.end)
							y: originY + SIGNAL_HEIGHT

					lastPoint = [polyPoints[polyPoints.length - 1].x, polyPoints[polyPoints.length - 1].y]
					polyLine = new fabric.Polyline polyPoints,
												stroke: signalColor
												fill: undefined
												selectable: no
												hasControls: no
												hasRotatingPoint: no

					@_canvas.add polyLine


			return [lastPoint[0], lastPoint[1], value, polyLine]
		else
			polyPoints = []
			lastPoint = []
			pointsTime = Date.now()
			polyPoints.push
					x: @_timeToPos(valueObject.start) + SIGNAL_BUS_SLOPE
					y: originY + SIGNAL_HEIGHT / 2.0
			polyPoints.push
					x: @_timeToPos(valueObject.start)
					y: originY
			polyPoints.push
					x: @_timeToPos(valueObject.start) + SIGNAL_BUS_SLOPE
					y: originY - SIGNAL_HEIGHT / 2.0
			polyPoints.push
					x: @_timeToPos(valueObject.end) - SIGNAL_BUS_SLOPE
					y: originY - SIGNAL_HEIGHT / 2.0
			unless isLast
				polyPoints.push
						x: @_timeToPos(valueObject.end)
						y: originY
			else
				polyPoints.push
						x: @_timeToPos(valueObject.end) + SIGNAL_BUS_SLOPE + 2
						y: originY - SIGNAL_HEIGHT / 2.0
				polyPoints.push
						x: @_timeToPos(valueObject.end) + SIGNAL_BUS_SLOPE + 2
						y: originY + SIGNAL_HEIGHT / 2.0

			polyPoints.push
					x: @_timeToPos(valueObject.end) - SIGNAL_BUS_SLOPE
					y: originY + SIGNAL_HEIGHT / 2.0
			polyPoints.push
					x: @_timeToPos(valueObject.start) + SIGNAL_BUS_SLOPE
					y: originY + SIGNAL_HEIGHT / 2.0

			lastPoint = [polyPoints[polyPoints.length - 1].x, polyPoints[polyPoints.length - 1].y]

			polyWidth = @pointDist polyPoints[2].x, polyPoints[2].y, polyPoints[3].x, polyPoints[3].y

			polyLine = new fabric.Polyline polyPoints,
										stroke: if value is 'x' then DEFAULT_COLOR.SIGNAL_DC else if value.toLowerCase() is 'z' then DEFAULT_COLOR.SIGNAL_IMPED else signalColor
										fill: undefined
										selectable: no
										hasControls: no
										hasRotatingPoint: no
			@_canvas.add polyLine
			centrePoint = polyLine.getCenterPoint()

			polyText = new fabric.Text @_getFormattedValue(value, valueObject.width),
															fontFamily: 'monospace'
															fontSize: 11
															selectable: no
															hasControls: no
															hasRotatingPoint: no
															fill: DEFAULT_COLOR.SIGNAL_VALUE


			textValue = ' ' + polyText.text
			textWidth = polyText.width

			widthOverflow = textWidth > polyWidth
			while textWidth > polyWidth
				textValue = textValue.substr 0, textValue.length - 1
				polyText.setText textValue
				polyText.setLeft polyText.left + 1
				textWidth = polyText.width
			if widthOverflow
				textValue = textValue + '..'
				polyText.setText textValue
				polyText.setLeft polyText.left + 1

			polyText.set 'left', centrePoint.x - polyText.width / 2.0
			polyText.set 'top', centrePoint.y - polyText.height / 2.0


			@_signalValueText.push
							textbox: polyText
							width: valueObject.width
							value: value
			@_canvas.add polyText
			return [@_timeToPos(valueObject.end), originY, value, polyLine]




	_getGridLine: (coords) ->
		new fabric.Line coords,
			fill: DEFAULT_COLOR.GRID_LINE
			stroke: DEFAULT_COLOR.GRID_LINE
			strokeWidth: 1
			opacity: 0.3
			selectable: no
			hasControls: no
			hasRotatingPoint: no

	_drawSignalNames: ->
		signalPos = SIGNAL_BOX_PADDING + RULER_HEIGHT
		@_signalNames = []
		@_signalCurrentValues = []
		for rendered in @renderedSignals
			signal = rendered.signal
			busSignal = @isBus signal.name
			nameboxText = new fabric.IText signal.name,
				fontFamily: 'monospace'
				left: 10
				top:  signalPos + 4
				fontSize: 12
				selectable: no
				hasControls: no
				hasRotatingPoint: no
				width: SIGNAL_BOX_WIDTH
				height: SIGNAL_BOX_HEIGHT
				fill: DEFAULT_COLOR.SIGNAL_NAME

			signalCurrentValue = new fabric.IText '0',
				fontFamily: 'monospace'
				left: SIGNAL_BOX_WIDTH + 12
				top:  signalPos + 4
				fontSize: 11
				selectable: no
				hasControls: no
				hasRotatingPoint: no
				width: SIGNAL_BOX_WIDTH
				height: SIGNAL_BOX_HEIGHT
				fill: DEFAULT_COLOR.SIGNAL_CURRENT_VALUE

			@_signalNames.push nameboxText

			rendered.text = nameboxText
			rendered.ypos = signalPos

			@_signalCurrentValues.push signalCurrentValue

			signalPos += (SIGNAL_BOX_HEIGHT + SIGNAL_BOX_PADDING)

		@_currentValueLineStart = new fabric.Line [SIGNAL_BOX_WIDTH + 10, 0, SIGNAL_BOX_WIDTH + 10, @_canvas.height],
			fill: DEFAULT_COLOR.CURRENT_VALUE_LINE
			stroke: DEFAULT_COLOR.CURRENT_VALUE_LINE
			strokeWidth: 1
			opacity: 1
			selectable: no
			hasControls: no
			hasRotatingPoint: no
		@_currentValueLineEnd = new fabric.Line [SIGNAL_NAMES_BOX_WIDTH, 0, SIGNAL_NAMES_BOX_WIDTH, @_canvas.height],
			fill: DEFAULT_COLOR.CURRENT_VALUE_LINE
			stroke: DEFAULT_COLOR.CURRENT_VALUE_LINE
			strokeWidth: 1
			opacity: 1
			selectable: no
			hasControls: no
			hasRotatingPoint: no

		@_canvas.add @_currentValueLineStart
		@_canvas.add @_currentValueLineEnd

		for textarea in @_signalNames
			@_canvas.add textarea
			if textarea.width > SIGNAL_BOX_WIDTH
				textarea.scaleToWidth SIGNAL_BOX_WIDTH - 10




	_getSignalValues: (wave, start = @renderFrom, end = @renderTo) ->
		return [] if wave.length is 0
		values = []

		valueAdded = no
		waveIndex = 0

		_between = (val, startRange = start, endRange = end) ->
			(val >= startRange) and (val <= endRange)

		while waveIndex < wave.length
			waveValue = wave[waveIndex]
			valueStart = Number.parseInt waveValue[0]
			valueEnd = if waveIndex is wave.length - 1 then end else Number.parseInt wave[waveIndex + 1][0]
			newValue =
				start: 0
				end: 0
				value: waveValue[1]

			if _between(valueStart) and _between(valueEnd)
				newValue.start = valueStart
				newValue.end = valueEnd
			else if _between(valueStart) and valueEnd > end
				newValue.start = valueStart
				newValue.end = end
			else if _between(valueEnd) and valueStart < start
				newValue.start = start
				newValue.end = valueEnd
			else
				waveIndex++
				continue

			values.push newValue
			valueAdded = yes
			waveIndex++

		return [
			{
				start: start
				end: end
				value: wave[wave.length - 1][1]
			}
		] unless valueAdded

		values


	_timeToPos: (time, from = @renderFrom, round = yes) ->
		if round
			Math.round(SIGNAL_NAMES_BOX_WIDTH + time * @_renderDistanceFactor - Math.round(from * @_renderDistanceFactor))
		else
			SIGNAL_NAMES_BOX_WIDTH + time * @_renderDistanceFactor - from * @_renderDistanceFactor

	_posToTime: (pos, from = @renderFrom, round = yes) ->
		if round
			Math.round((pos - SIGNAL_NAMES_BOX_WIDTH) / @_renderDistanceFactor) + Math.round from
		else
			(pos - SIGNAL_NAMES_BOX_WIDTH) / @_renderDistanceFactor + from


	_getFormattedValue: (value, length = 8) ->
		if @radix is RADIX_DEC
			if value is 'x'
				"#{@pad(value, length, 'x')}"
			else if value.toLowerCase() is 'z'
				"#{@pad(value, length, 'z')}"
			else
				"#{@binToDec(value)}"
		else if @radix is RADIX_HEX
			if value is 'x'
				"#{@pad(value, length, 'x')}"
			else if value.toLowerCase() is 'z'
				"#{@pad(value, length, 'z')}"
			else
				"0x#{@binToHex(value)}"
		else if @radix is RADIX_BIN
			if value is 'x'
				"#{@pad(value, length, 'x')}"
			else if value.toLowerCase() is 'z'
				"#{@pad(value, length, 'z')}"
			else
				"#{@pad(value, length)}"


	_initLayout: ->
		@_addSignalButtonId = "#{@_containerId}-waveform-add-btn"
		@_addSignalButton = $("<button class=\"waveform-toolbar-btn\" id=\"#{@_addSignalButtonId}\">Add Sginal</button>")
		@_removeSignalButtonId = "#{@_containerId}-waveform-remove-btn"
		@_removeSignalButton = $("<button class=\"waveform-toolbar-btn\" id=\"#{@_removeSignalButtonId}\">Remove Sginal</button>")
		@_zoomInButtonId = "#{@_containerId}-waveform-zoomin-btn"
		@_zoomInButton = $("<button class=\"waveform-toolbar-btn\" id=\"#{@_zoomInButtonId}\">Zoom In</button>")
		@_zoomOutButtonId = "#{@_containerId}-waveform-zoomout-btn"
		@_zoomOutButton = $("<button class=\"waveform-toolbar-btn\" id=\"#{@_zoomOutButtonId}\">Zoom Out</button>")
		@_zoomAllButtonId = "#{@_containerId}-waveform-zoomall-btn"
		@_zoomAllButton = $("<button class=\"waveform-toolbar-btn\" id=\"#{@_zoomAllButtonId}\">Zoom All</button>")
		@_gotoFirstButtonId = "#{@_containerId}-waveform-gotofirst-btn"
		@_gotoFirstButton = $("<button class=\"waveform-toolbar-btn\" id=\"#{@_gotoFirstButtonId}\">Goto First</button>")
		@_goLeftButtonId = "#{@_containerId}-waveform-goleft-btn"
		@_goLeftButton = $("<button class=\"waveform-toolbar-btn\" id=\"#{@_goLeftButtonId}\">Go Left</button>")
		@_goRightButtonId = "#{@_containerId}-waveform-goright-btn"
		@_goRightButton = $("<button class=\"waveform-toolbar-btn\" id=\"#{@_goRightButtonId}\">Go Right</button>")
		@_resetButtonId = "#{@_containerId}-waveform-reset-btn"
		@_resetButton = $("<button class=\"waveform-toolbar-btn\" id=\"#{@_goRightButtonId}\">Reset Timing Diagram</button>")
		@_radixSelectBinId = "#{@_containerId}-waveform-radix-bin"
		@_optionBin = $("<option class=\"waveform-toolbar-option\" id=\"#{@_radixSelectBinId}\" value=\"#{@_radixSelectBinId}\" selected>Binary</option>")
		@_radixSelectDecId = "#{@_containerId}-waveform-radix-dec"
		@_optionDec = $("<option class=\"waveform-toolbar-option\" id=\"#{@_radixSelectDecId}\" value=\"#{@_radixSelectDecId}\">Decimal</option>")
		@_radixSelectHexId = "#{@_containerId}-waveform-radix-hex"
		@_optionHex = $("<option class=\"waveform-toolbar-option\" id=\"#{@_radixSelectHexId}\" value=\"#{@_radixSelectHexId}\">Hexadecimal</option>")
		@_radixSelectId = "#{@_containerId}-waveform-radix-select"
		@_radixSelectLabelId = "#{@_containerId}-waveform-radix-select-label"
		@_radixSelectLabel = $("<label class=\"waveform-toolbar-label\" id=\"#{@_radixSelectLabelId}\" for=\"#{@_radixSelectId}\">Select a speed</label>")
		@_radixSelect = $("<select class=\"waveform-toolbar-select\" name=\"radix-select\" id=\"#{@_radixSelectId}\"></select>")

		@_cursorValueId = "#{@_containerId}-waveform-toolbar-cursor-value"
		@_cursorValueDiv = $("<div id=\"#{@_cursorValueId}\" class=\"cursor-toolbar-value\">Cursor: 0ns</div>")

		@_modalDialogId = "#{@_containerId}-waveform-modal"
		@_modalDialog = $("<div id=\"#{@_modalDialogId}\"></div>")

		@_toolbardId = "#{@_containerId}-waveform-toolbar"
		@_waveformToolbar = $("<div id=\"#{@_toolbardId}\" class=\"ui-widget-header ui-corner-all waveform-toolbar\"></div>")

		@_waveformToolbar.append @_addSignalButton
		@_waveformToolbar.append @_removeSignalButton
		@_waveformToolbar.append @_zoomInButton
		@_waveformToolbar.append @_zoomOutButton
		@_waveformToolbar.append @_zoomAllButton
		@_waveformToolbar.append @_gotoFirstButton
		@_waveformToolbar.append @_goLeftButton
		@_waveformToolbar.append @_goRightButton
		@_waveformToolbar.append @_resetButton

		@_radixSelect.append @_optionBin
		@_radixSelect.append @_optionDec
		@_radixSelect.append @_optionHex

		@_waveformToolbar.append @_radixSelect
		@_waveformToolbar.append @_cursorValueDiv
		@_cursorValueDiv.hide()

		@_container.append @_waveformToolbar
		@_container.append @_modalDialog

		@_canvasId = "#{@_containerId}-waveform-canvas"
		@_canvasWrapper = $("<canvas class=\"waveform-canvas\" id=\"#{@_canvasId}\"></canvas>")



		@_canvasViewportId = "#{@_containerId}-waveform-canvas-viewport"
		@_canvasViewport = $("<div class=\"canvas-viewport\" id=\"#{@_canvasViewportId}\"></div>")



		@_canvasViewport.append @_canvasWrapper

		@_container.append @_canvasViewport
		@canvasHeight = CANVAS_MAX_HEIGHT
		@canvasWidth = @_container.width()
		@viewportHeight = @_container.height()
		@canvasHeight = CANVAS_MAX_HEIGHT


		@_canvasViewport.attr 'tabIndex', 1000

		$("##{@_canvasViewportId}").keydown (e)=>
			if e.keyCode is 38
				if @highlighted
					@highlighted.fill = undefined
					@highlighted.opacity = 0
				@highlightedIndex--
				@highlightedIndex = @renderedSignals.length - 1 if @highlightedIndex < 0
				@highlighted = @renderedSignals[@highlightedIndex].highlight
				@highlighted.fill = DEFAULT_COLOR.SIGNAL_HIGHLIGHT
				@highlighted.opacity = DEFAULT_OPACITY.SIGNAL_HIGHLIGHT
				@_canvas.renderAll()
				@setCursorTime @currentExactTime
				e.preventDefault()
			else if e.keyCode is 40
				if @highlighted
					@highlighted.fill = undefined
					@highlighted.opacity = 0
				@highlightedIndex++
				@highlightedIndex = 0 if @highlightedIndex >= @renderedSignals.length
				@highlighted = @renderedSignals[@highlightedIndex].highlight
				@highlighted.fill = DEFAULT_COLOR.SIGNAL_HIGHLIGHT
				@highlighted.opacity = DEFAULT_OPACITY.SIGNAL_HIGHLIGHT
				@_canvas.renderAll()
				@setCursorTime @currentExactTime
				e.preventDefault()
			else if e.ctrlKey and e.keyCode is 83
				if @_onSaveListener
					@_onSaveListener @exportTimingDiagram()
				e.preventDefault()


		@_addSignalButton.button
			text: no
			icons:
				primary: 'ui-icon-plus'
		@_addSignalButton.click (e) =>
			@addSignal()

		@_removeSignalButton.button
			text: no
			icons:
				primary: 'ui-icon-minus'
		@_removeSignalButton.click (e) =>
			@removeSignal()

		@_zoomInButton.button
			text: no
			icons:
				primary: 'ui-icon-zoomin'
		@_zoomInButton.click (e) =>
			@zoomIn()

		@_zoomOutButton.button
			text: no
			icons:
				primary: 'ui-icon-zoomout'
		@_zoomOutButton.click (e) =>
			@zoomOut()

		@_zoomAllButton.button
			text: no
			icons:
				primary: 'ui-icon-arrow-4-diag'
		@_zoomAllButton.click (e) =>
			@zoomAll()

		@_gotoFirstButton.button
			text: no
			icons:
				primary: 'ui-icon-arrowstop-1-w'
		@_gotoFirstButton.click (e) =>
			@moveFirst()

		@_goLeftButton.button
			text: no
			icons:
				primary: 'ui-icon-triangle-1-w'
		@_goLeftButton.click (e) =>
			@moveLeft()

		@_goRightButton.button
			text: no
			icons:
				primary: 'ui-icon-triangle-1-e'
		@_goRightButton.click (e) =>
			@moveRight()

		@_resetButton.button
			text: no
			icons:
				primary: 'ui-icon-arrowrefresh-1-n'
		@_resetButton.click (e) =>
			@resetTimingDiagram()

		@_radixSelect.selectmenu()

		$("##{@_containerId}-waveform-radix-select-button").css('display', 'inline-table')
		$("##{@_containerId}-waveform-radix-select-button").find('.ui-selectmenu-text').css('line-height', '0.6')

		@_radixSelect.on "selectmenuchange", (ui, e) =>
			selectedRadixId = e.item.value
			if selectedRadixId is @_radixSelectBinId
				@setRadix RADIX_BIN
			else if selectedRadixId is @_radixSelectDecId
				@setRadix RADIX_DEC
			else if selectedRadixId is @_radixSelectHexId
				@setRadix RADIX_HEX
