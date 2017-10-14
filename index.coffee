do ->
	repoName = window.repoName
	ownerName = window.ownerName
	repoTitle = window.repoTitle
	topModule = ''
	topModuleEntry = undefined
	topModuleId = undefined
	menu = undefined

	repoUrl = '/' + ownerName + '/' + repoName + '/'

	defaultFontSize = 15
	defaultThemeIndex = 0

	socket = undefined

	$('#init-vars').remove()

	Urls =
		retrieve:
			stdcell: repoUrl + 'stdcell'
			tree: repoUrl
			file: repoUrl + 'get/'
			ips: repoUrl + 'ips'
			boards: repoUrl + 'boards'
		ajax: repoUrl + 'ajax'
		upload: repoUrl
		download: repoUrl + 'download/'
		compile: repoUrl + 'compile'
		settings: repoUrl + 'ws/settings'
		login: '/login'
		bug: '/bug'
		externalExport: '/external/export'
		cloudvHelp: 'https://github.com/Cloud-V/Documentation/wiki'
		aboutCloudV: '/about'
	newMenuChildren = [
		{
			title: 'Verilog Module'
			cmd: 'newverilog'
		}
		{
			title: 'Verilog Testbench'
			cmd: 'newtestbench'
		}
		{
			title: 'Finite State Machine (WIP)'
			cmd: 'newfsm'
		}
		{
			title: 'Plain Text Document'
			cmd: 'newtext'
		}
		{
			title: 'IP Core'
			cmd: 'newip'
		}
		{
			title: 'Pin Constraints File'
			cmd: 'newpcf'
		}
		{
			title: "System Model File (WIP)"
			cmd: 'newsys'
		}
		{
			title: 'System-on-Chip (WIP)'
			cmd: 'newsoc'
		}
		# {
		# 	title: 'C++ Source File (CPP) (WIP)'
		# 	cmd: 'newcpp'
		# }
		# {
		# 	title: 'C++ Header File (HPP) (WIP)'
		# 	cmd: 'newhpp'
		# }
	]

	contextMenuHandler = (cmd, isContext) ->
		switch cmd
			when 'newverilog' then newVerilog(isContext)
			when 'newtestbench' then newTestbench(isContext)
			when 'newfsm' then newFSM(isContext)
			when 'newsoc' then newSOC(isContext)
			when 'newcpp' then newCPP(isContext)
			when 'newhpp' then newHPP(isContext)
			when 'newsys' then newSYS(isContext)
			when 'newtext' then newText(isContext)
			when 'newip' then newIP(isContext)
			when 'newpcf' then newPCF(isContext)
			when 'newfolder' then newFolder(isContext)
			when 'open' then openFile(isContext)
			when 'copy' then copyFile(isContext)
			when 'cut' then cutFile(isContext)
			when 'paste' then pasteFile(isContext)
			when 'rename' then renameFile(isContext)
			when 'delete' then deleteFile(isContext)
			when 'duplicate' then duplicateFile(isContext)
			when 'download-file' then downloadFile(isContext)
			when 'exclude' then excludeFromBuild(isContext)
			when 'toverilog' then convertIntoVerilog(isContext)
			when 'totestbench' then convertIntoTestbench(isContext)
			when 'include' then includeInBuild(isContext)
			when 'close' then closeFile(isContext)
			when 'settop' then setTopModule(isContext)
	writeableFiles = ['verilog', 'exverilog', 'text', 'fsm', 'testbench', 'ip', 'exip', 'soc', 'sys', 'cpp', 'hpp']

	buildFolderId = null

	login = (successCB, errorCB) ->
		title = 'Session has expired, please login again..'

		htmlContent = """<form action=\"#\" id=\"login-form\">
			<fieldset class="ui-helper-reset">
				<div class="dialog-input-group">
					<label for="username">Username: </label>
					<input type="text" name="username" id="username" value="">
				</div>
				<div class="dialog-input-group">
					<label for="password">Password: </label>
					<input type="password" name="password" id="password" value="">
				</div>
				<div class ="synth-checkbox-div">
					<input type="checkbox" id="rememberme" class="synth-checkbox">
					<label class="synth-checkbox-label" for="rememberme">Remember Me</label>
				</div>
			</fieldset>
		</form>
		"""

		$('#login-box').html htmlContent

		$('#login-form').on 'submit', (e) ->
			e.preventDefault()
			e.stopPropagation()

		confirmed = no
		username = ''
		password = ''
		rememberme = no
		alertify.loginDialog or alertify.dialog 'loginDialog',(->
			main: (content) ->
				@setContent content
			prepare: ->
				confirmed = no
				fileTitle = ''
				overwrite = no
				matchId = null
				seq = no
			setup: ->
					focus:
						element: '#file_title'
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
							text: 'Login'
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
				success: ->
				fail: ->
			callback: (closeEvent) ->
						if closeEvent.index is 0
							username = $('#username').val()
							if username.trim() is ''
								closeEvent.cancel = yes
								return
							password = $('#password').val()
							if password is ''
								closeEvent.cancel = yes
								return
							rememberme = $('#rememberme').is(':checked')
							confirmed = yes


			hooks:
				onclose: ->
					$('#login-box').html('')
					if confirmed
						loadingOn('Logging in..')
						requestBody =
							type: 'POST'
							url: "#{window.location.protocol}//#{window.location.host}#{Urls.login}"
							async: true
							contentType: 'application/json'
							data: JSON.stringify
								username: username
								password: password
								rememberme: rememberme
							success: (res) =>
								loadingOff()
								@settings.success()
							error: (error) =>
								loadingOff()
								@settings.fail error: 'Authentication failed.'
						$.ajax requestBody
					else
						errorCB error: 'Login cancelled.'
		), yes
		dialogInstance = alertify.loginDialog($('#login-box').get(0)).set('title', title).set('success', successCB).set('fail', errorCB)





		return
		$("#login-box").dialog
			resizable: no
			modal: yes
			title: 'Session has expired, please login again..'
			height: 240
			width: 320
			buttons:
				'Login': () ->
					username = $('#username').val()
					return if username.trim() is ''
					password = $('#password').val()
					return if password.trim() is ''
					rememberme = $('#rememberme').is(':checked')

					thisContainer = $(@)

					confirmed = yes
					thisContainer.dialog('close')


				'Cancel': () ->
					$(@).dialog('close')

			close: () ->
				$('#login-box').html('')
				if confirmed
					loadingOn('Logging in..')
					requestBody =
						type: 'POST'
						url: "#{window.location.protocol}//#{window.location.host}#{Urls.login}"
						async: true
						contentType: 'application/json'
						data: JSON.stringify
							username: username
							password: password
							rememberme: rememberme
						success: (res) ->
							loadingOff()
							successCB()
						error: (error) ->
							loadingOff()
							errorCB error: 'Authentication failed.'
					$.ajax requestBody
				else
					errorCB error: 'Login cancelled.'

		$("#login-box").keypress (e) ->
			if e.keyCode is 13
				createButton = $('#login-box').parent().find '.ui-button:contains(\"Login\")'
				createButton.click()
				e.preventDefault()
				e.stopPropagation()

	request = (url, method, params, successCB, errorCB) ->
		if typeof params is 'function'
			errorCB = successCB
			successCB = params
			params = {}
		isOnline = navigator.onLine

		unless isOnline
			return errorCB(error: 'Unable to connect, please check your internet connectivity.')
		if socket
			unless socket.connected
				return errorCB(error: 'Unable to connect to the server, please check your internet connectivity.')

		requestBody =
			type: method
			url: "#{window.location.protocol}//#{window.location.host}#{url}"
			async: true
			contentType: 'application/json'
			data: JSON.stringify(params) or ''
			success: (res) ->
				successCB res
			error: (error) ->
				if error.status is 401
					loadingOff()
					login (->
						request url, method, params, successCB, errorCB
						), (err) ->
							if typeof err is 'object'
								errorCB err
							else if typeof err is 'string'
								try
									err = JSON.parse err
									errorCB err
								catch e
									errorCB error : err
				else
					try
						err = JSON.parse error.responseText
						errorCB err
					catch e
						errorCB error : error.responseText
		$.ajax requestBody

	absPath = (path) ->
		if not location.origin
			location.origin = "#{location.protocol}//#{location.host}"
		"#{location.origin}/IDE/#{path}"

	encodeParams = (data) ->
		Object.keys(data).map((key) ->
			[key, data[key]].map(encodeURIComponent).join '='
		).join '&'

	getValidModuleRegEx = ->
		new RegExp '^[\\w\\.]+$', 'g'

	getModuleRegEx = ->
		new RegExp '^\\s*module\\s+(.+?)\\s*(#\\s*\\(([\\s\\S]+?)\\)\\s*)??\\s*((\\([\\s\\S]*?\\))?\\s*;)([\\s\\S]*?)endmodule', 'gm'

	extractModules = (content = '') ->
		content = content.replace(getCommentsRegEx(), '').replace(getMultiCommentsRegEx(), '')
		moduleRegEx = getModuleRegEx()
		modules = []
		moduleMatches = moduleRegEx.exec(content)
		while moduleMatches isnt null
			moduleName = moduleMatches[1]
			if moduleName not in modules
				modules.push moduleName.trim()
			moduleMatches = moduleRegEx.exec(content)
		modules

	getCommentsRegEx = ->
		new RegExp '\\/\\/.*$', 'gm'

	getMultiCommentsRegEx = ->
		new RegExp '\\/\\*(.|[\\r\\n])*?\\*\\/', 'gm'

	loadingOn = (loadingText = 'Please wait..') ->
		$('#loading-text').text loadingText
		$("#loading-div-background").show()

	loadingOff = ->
		$("#loading-div-background").hide()

	displayMessage = (message, type) ->
		if not message? or typeof message isnt 'string' or message.trim() is ''
			message = "Unkown error has occurred."
		noty
			text: message
			type: type
			theme: 'relax'
			layout: 'topCenter'
			timeout: 3000
			animation:
				open: 'animated fadeIn'
				close: 'animated fadeOut'
				speed: 500

	displayError = (errorMessage) ->
		displayMessage (errorMessage.error or errorMessage), 'error'

	displayWarning = (warningMessage) ->
		displayMessage warningMessage, 'warning'

	displayInfo = (infoMessage) ->
		displayMessage infoMessage, 'information'

	displaySuccess = (successMessage) ->
		displayMessage successMessage, 'success'

	logMessage = (messageObject, elementId) ->
		messageEl = $("<li class=\"ui-widget-content\">#{messageObject.message}</li>")
		$("##{elementId}").append(messageEl)
		if messageObject.file?
			messageEl.data 'fileId', messageObject.file
			messageEl.data 'line', messageObject.line

		messageEl.dblclick (e) ->
			thisMessage = $(@)
			fileId = thisMessage.data 'fileId'
			lineNumber = thisMessage.data 'line'

			if fileId?
				selectNode fileId
				if getSelectedNodeId() is fileId
					openFile no, (err) ->
						if err
							displayError err
						else
							if typeof lineNumber is 'number'
								editor = getActiveEditor()
								if editor
									editor.gotoLine lineNumber

	logError = (errorObject) ->
		logMessage errorObject, 'error-list'

	logWarning = (warningObject) ->
		logMessage warningObject, 'warning-list'

	logInfo = (infoObject) ->
		logMessage infoObject, 'console-list'

	clearErrorLogs = ->
		$('#error-list').html('')

	clearWarningLogs = ->
		$('#warning-list').html('')

	clearInfoLogs = ->
		$('#console-list').html('')

	clearAllGrids = ->
		clearErrorLogs()
		clearWarningLogs()
		clearInfoLogs()

	setLogTab = (index) ->
		if typeof index is 'string'
			return if not index in ['console', 'error', 'warning']
			indexMap =
				console: 0
				error: 1
				warning: 2
			index = indexMap[index]
		else if typeof index is 'number'
			return if not index in [0, 1, 2]
		else
			return
		el = undefined
		if index is 0
			el = $("#console-tab").get(0)
		else if index is 1
			el = $("#errors-tab").get(0)
		else if index is 2
			el = $("#warnings-tab").get(0)
		if el
			logTabManager.setCurrentTab el

	$('#console-list').selectable
		autoRefresh: yes
		cancel: '.ui-selected'
		stop: (event, ui) ->
			$(event.target).children('.ui-selected').not(':first').removeClass('ui-selected')

	$('#error-list').selectable
		autoRefresh: yes
		cancel: '.ui-selected'
		stop: (event, ui) ->
			$(event.target).children('.ui-selected').not(':first').removeClass('ui-selected')

	$('#warning-list').selectable
		autoRefresh: yes
		cancel: '.ui-selected'
		stop: (event, ui) ->
			$(event.target).children('.ui-selected').not(':first').removeClass('ui-selected')

	onSplitterDrag = (e) ->
		editor = getActiveEditor()
		if editor and editor?
			editor.resize()
		newHeight = $("#logs").height() + 2
		$("#log-content").css('height', newHeight)
		fsm = getActiveFSM()
		if fsm and fsm?
			fsm.refreshSizes()
		resizeHanlder()

	$('#files-editors-logs').layout
		west__paneSelector:		".outer-west"
		center__paneSelector:		".outer-center"
		west__size:				$(document).width() * (1 / 6)
		center__size:			$(document).width() * (5 / 6)
		west__maxSize:			0
		center__maxSize:		0
		west__onresize_end: onSplitterDrag
		center__onresize_end: onSplitterDrag
		showDebugMessages:	yes
		resizable:	yes

	$("#editors-logs").layout
		center__paneSelector:		".inner-center"
		south__paneSelector:		".inner-south"
		center__size:				$(document).height() * (2 / 3)
		south__size:				$(document).height() * (1 / 3)
		center__maxSize: 0
		south__maxSize: 0
		center__onresize_end: onSplitterDrag
		south__onresize_end: onSplitterDrag
		showDebugMessages:	yes
		resizable:  yes

	highlightedId = null
	contextId = null

	adjustFileSuffix = (fileName, suffix) ->
		if fileName.indexOf(suffix, fileName.length - suffix.length) isnt -1
			fileName = fileName.substring(0, fileName.length - suffix.length)
		fileName

	getFileExtension = (targetNode) ->
		nodeType = targetNode.type
		if nodeType is 'root' or nodeType is 'buildFolder' or nodeType is 'folder'
			return ''
		else if nodeType is 'verilog' or targetNode.type is 'exverilog'
			return '.v'
		else if nodeType is 'ip' or nodeType is 'exip'
			return '.ip'
		else if nodeType is 'testbench'
			return '.v'
		else if nodeType is 'netlist'
			return '.v'
		else if nodeType is 'srpt'
			return '.rpt'
		else if nodeType is 'text'
			return '.txt'
		else if nodeType is 'vcd'
			return '.vcd'
		else if nodeType is 'fsm'
			return '.fsm'
		else if nodeType is 'sta'
			return '.sta'
		else if nodeType is 'sys'
			return '.sys'
		else if nodeType is 'soc'
			return '.soc'
		else if nodeType is 'cpp'
			return '.cpp'
		else if nodeType is 'hhp'
			return '.hhp'
		else if nodeType is 'obj'
			return '.obj'
		else if nodeType is 'hex'
			return '.hex'
		else if nodeType is 'module' or nodeType is 'topmodule'
			return ''
		else
			return ''

	confirmationDialog = (title, htmlContent, cb, width = 350, height = 150) ->
		$('#dialog-confirm').html htmlContent

		confirmed = no

		alertify.confirmationDialog or alertify.dialog 'confirmationDialog',(->
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
					$('#dialog-confirm').html('')
					@settings.callback confirmed
		), yes
		alertify.confirmationDialog($('#dialog-confirm').get(0)).set('title', title).set('callback', cb)

	promptDialog = (title, htmlContent, cb, width = 350, height = 150) ->
		$('#dialog-confirm').html(htmlContent)
		accepted = no
		cancelled = no

		alertify.promptDialog or alertify.dialog 'promptDialog',(->
			main: (content) ->
				@setContent content
			prepare: ->
				accepted = no
				cancelled = no
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
							text: 'Yes'
							key: 13
							className: alertify.defaults.theme.ok
							attrs:
								attribute:'value'
							scope:'auxiliary'
							element: undefined
						}
						{
							text: 'No'
							invokeOnClose: yes
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
			callback: (closeEvent) ->
				if closeEvent.index is 0
					accepted = yes
				else if closeEvent.index is 2
					cancelled = yes
			hooks:
				onclose: ->
					$('#dialog-confirm').html('')
					@settings.callback accepted, cancelled
		), yes
		alertify.promptDialog($('#dialog-confirm').get(0)).set('title', title).set('callback', cb)

	dialogBox = (title, htmlContent, width = 350, height = 180) ->

		$('#dialog-box').html(htmlContent)

		alertify.dialogBox or alertify.dialog 'dialogBox',(->
			main: (content) ->
				@setContent content
			prepare: ->
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
					]
			callback: (closeEvent) ->

			hooks:
				onclose: ->
					$('#dialog-box').html('')
		), yes
		alertify.dialogBox($('#dialog-box').get(0)).set 'title', title

	reportDialog = (cb, width = 350, height = 150) ->
		title = "Report a Bug"
		htmlContent = """<form action=\"#\" id=\"new-bug-form\">
			<fieldset class="ui-helper-reset">
				<div class="dialog-input-group">
					<label class="dialog-singleline-label" for="bug_title">Title: </label>
					<input class="fill-parent" type="text" name="bug_title" id="bug_title" value="" class="fill-parent">
				</div>
				<div class="dialog-input-group">
					<label class="dialog-singleline-label" for="bug_description">Bug Description: </label>
					<textarea class="fill-parent" name="bug_description" id="bug_description" value=""></textarea>
				</div>
			</fieldset>
		</form>
		"""

		$('#dialog-box').html htmlContent

		$('#new-bug-form').on 'submit', (e) ->
			e.preventDefault()
			e.stopPropagation()

		confirmed = no
		bugTitle = ''
		bugBody = ''
		alertify.bugReportDialog or alertify.dialog 'bugReportDialog',(->
			main: (content) ->
				@setContent content
			prepare: ->
				confirmed = no
				bugTitle = ''
				bugBody = ''
			setup: ->
					focus:
						element: '#file_title'
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
							text: 'Submit'
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
			callback: (closeEvent) ->
						if closeEvent.index is 0
							bugTitle = $('#bug_title').val()
							if bugTitle.trim() is ''
								closeEvent.cancel = yes
								return
							bugBody = $('#bug_description').val()
							if bugBody.trim() is ''
								closeEvent.cancel = yes
								return

							confirmed = yes

			hooks:
				onclose: ->
					$('#dialog-box').html('')
					@settings.callback confirmed, bugTitle, bugBody
		), yes
		dialogInstance = alertify.bugReportDialog($('#dialog-box').get(0)).set('title', title).set('callback', cb)


	getSelectedNodeId = ->
		selected =  $('#files').jstree('get_selected')
		if not selected? or selected.length isnt 1
			no
		else
			selected[0]

	getNodeById = (id)->
		$('#files').jstree(yes).get_node id

	getSelectedNode = ->
		selectedId = getSelectedNodeId()
		if not selectedId
			no
		else
			getNodeById selectedId

	getTargetNode = (isContext = no) ->
		if isContext
			getNodeById contextId
		else
			getSelectedNode()

	getParentTargetNode = (isContext = no) ->
		if isContext
			getTopFolderNode(getNodeById contextId)
		else
			getTopFolderNode()

	isFolderNode = (nodeType) ->
		nodeType in ['folder', 'buildFolder', 'root']

	getTopFolderNode = (selectedNode)->
		unless selectedNode?
			selectedNode = getSelectedNode()
		if not selectedNode
			rootId = getNodeById('#').children
			if rootId.length is 0
				return ''
			else
				getNodeById rootId[0]
		else
			if isFolderNode selectedNode.type
				selectedNode
			else
				parentId = selectedNode.parent
				parentNode = getNodeById parentId
				until isFolderNode parentNode.type
					parentId = parentNode.parent
					parentNode = getNodeById parentId
				parentNode

	getBuildFolderNode = ->
		return getNodeById(buildFolderId) if buildFolderId?
		rootChildren = getNodeById(getNodeById('#').children[0]).children
		for childId in rootChildren
			childNode = getNodeById childId
			if childNode.type is 'buildFolder'
				buildFolderId = childId
				return childNode
		return false

	isNodeOpen = (id) ->
		$('#files').jstree('is_open', id)

	openNode = (id) ->
		$('#files').jstree('open_node', id)
		parentId = getNodeById(id).parent
		while parentId isnt '#'
			$('#files').jstree('open_node', parentId)
			parentId = getNodeById(parentId).parent

	createNode = (nodeId, parentId, nodeText, type, pos = 'last') ->
		typeClass = 'tree-file-item'

		if type in ['folder', 'buildFolder']
			typeClass = 'tree-folder-item'
		else if type is 'root'
			typeClass = 'tree-root-item'
		else if type in ['module', 'topmodule']
			typeClass = 'tree-module-item'


		x = $('#files').jstree(yes).create_node(parentId,
			{
				id: nodeId
				text: nodeText
				type: type
				li_attr:
					class: "tree-item #{typeClass}"
			}, pos, ((createdNode) ->
				if not isNodeOpen parentId
					openNode parentId
		))
		getNodeById nodeId

	getNodeIndex = (node) ->
		if typeof node is 'string'
			node = getNodeById node
		getNodeById(node.parent).children.indexOf node.id

	createFolder = (folderId, parentId, folderText) ->
		createNode(folderId, parentId, folderText, 'folder')

	deleteNode = (id) ->
		$('#files').jstree(yes).delete_node id
		forceCloseTab "tabs-#{id}"

	renameNode = (id, newName) ->
		if typeof id is 'string'
			id = getNodeById id
		$('#files').jstree(yes).rename_node id, newName

	selectNode = (id) ->
		$('#files').jstree(yes).deselect_all()
		$("#files").jstree("select_node", id).trigger("select_node.jstree")

	deleteChildren = (id) ->
		parentNode = getNodeById id
		if parentNode
			for childId in parentNode.children
				deleteNode childId
			yes
		else
			no

	setNodeId = (id, newId) ->
		$('#files').jstree('set_id', id, newId)

	hasChild = (parentId, childText) ->
		parentNode = getNodeById parentId
		for childId in parentNode.children
			if getNodeById(childId).text is childText
				return childId
		no
	refreshTabIcon = (targetNode) ->
		fileId = targetNode.id
		tabId = "tabs-#{fileId}"
		fileTab = $("##{tabId}")
		if fileTab.length
			tabEl = fileTab.get(0)
			tabManager.updateTab tabEl, favicon: targetNode.icon

	hideMenuItem = (itemId) ->
		itemId = "menu-#{itemId}"
		menu.hide itemId

	showMenuItem = (itemId) ->
		itemId = "menu-#{itemId}"
		menu.show itemId

	enableMenuItem = (itemId) ->
		itemId = "menu-#{itemId}"
		menu.enable itemId

	disableMenuItem = (itemId) ->
		itemId = "menu-#{itemId}"
		menu.disable itemId

	getWarnDialogHTML = (message) ->
		dialogMessage = "<table><tbody><tr><td><i class=\"fa fa-exclamation-triangle fa-2x\" aria-hidden=\"true\" style=\"vertical-align: middle;\"></i></td><td style=\"padding-left: 1em;\"><p>#{message}</p></td></tr></tbody></table>"
		return dialogMessage

	fileDialog = (title, message, defaultValue, parentNode, suffix = '', cb) ->

		htmlContent = """<form action=\"#\" id=\"new-file-form\">
			<fieldset class="ui-helper-reset">
				<label for="file_title">#{message}</label>
				<input type="text" name="file_title" id="file_title" value="#{defaultValue}">
			</fieldset>
		</form>
		"""

		$('#prompt-dialog').html htmlContent

		$('#new-file-form').on 'submit', (e) ->
			e.preventDefault()
			e.stopPropagation()

		confirmed = no
		fileTitle = ''
		overwrite = no
		matchId = null
		seq = no
		dialogInstance = undefined
		wait = no
		alertify.fileDialog or alertify.dialog 'fileDialog',(->
			main: (content) ->
				@setContent content
			prepare: ->
				confirmed = no
				fileTitle = ''
				overwrite = no
				matchId = null
				seq = no
				wait = no
			setup: ->
					focus:
						element: '#file_title'
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
							text: 'Create'
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
				suffix: ''
				parent: undefined
			callback: (closeEvent) ->
						if closeEvent.index is 0
							fileTitle = $('#file_title').val()
							if fileTitle.trim() is ''
								closeEvent.cancel = yes
								return

							fileTitle = adjustFileSuffix fileTitle, @settings.suffix
							fileTitle = "#{fileTitle}#{@settings.suffix}"

							if matchId = hasChild(@settings.parent.id, fileTitle)
								dialogTitle = "Overwrite #{fileTitle}?"
								dialogMessage = "<table><tbody><tr><td><i class=\"fa fa-exclamation-triangle fa-2x\" aria-hidden=\"true\" style=\"vertical-align: middle;\"></i></td><td style=\"padding-left: 1em;\"><p>\"#{fileTitle}\" already exists. Are you sure you want to overwrite it?</p></td></tr></tbody></table>"
								wait = yes
								confirmationDialog dialogTitle, dialogMessage, (accepted) =>
									if accepted
										confirmed = yes
										overwrite = yes
									$('#prompt-dialog').html('')
									@settings.callback confirmed, fileTitle, overwrite, matchId
							else
								confirmed = yes

			hooks:
				onclose: ->
					return if wait
					$('#prompt-dialog').html('')
					@settings.callback confirmed, fileTitle, overwrite, matchId
		), yes
		dialogInstance = alertify.fileDialog($('#prompt-dialog').get(0))
								.set('title', title)
								.set('callback', cb)
								.set('parent', parentNode)
								.set('suffix', suffix)

	fsmDialog = (title, message, defaultValue, parentNode, suffix = '', cb) ->
		htmlContent = """<form action=\"#\" id=\"new-file-form\">
			<fieldset class="ui-helper-reset">
				<label for="file_title">#{message}</label>
				<input type="text" name="file_title" id="file_title" value="#{defaultValue}">
				<div>
					<label for="options-list module-label">FSM Type:</label>
					<select class=\"prompt-select\" name=\"options-list\" tabindex=\"0\" id=\"options-list\">
						<option value=\"0">Moore Machine</option>
						<option value=\"1\">Mealy Machine</option>
					</select>
				</div>
			</fieldset>
		</form>
		"""

		$('#prompt-dialog').html htmlContent

		$('#new-file-form').on 'submit', (e) ->
			e.preventDefault()
			e.stopPropagation()

		confirmed = no
		fileTitle = ''
		overwrite = no
		matchId = null
		seq = no
		dialogInstance = undefined
		wait = no
		fsmType = 0
		alertify.fsmDialog or alertify.dialog 'fsmDialog', (->
			main: (content) ->
				@setContent content
			prepare: ->
				confirmed = no
				fileTitle = ''
				overwrite = no
				matchId = null
				seq = no
				wait = no
				fsmType = 0
			setup: ->
					focus:
						element: '#file_title'
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
							text: 'Create'
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
				suffix: ''
				parent: undefined
			callback: (closeEvent) ->
						if closeEvent.index is 0
							fileTitle = $('#file_title').val()
							if fileTitle.trim() is ''
								closeEvent.cancel = yes
								return
							fsmType = $('#options-list').val()

							fileTitle = adjustFileSuffix fileTitle, @settings.suffix
							fileTitle = "#{fileTitle}#{@settings.suffix}"

							if matchId = hasChild(@settings.parent.id, fileTitle)
								dialogTitle = "Overwrite #{fileTitle}?"
								dialogMessage = "<table><tbody><tr><td><i class=\"fa fa-exclamation-triangle fa-2x\" aria-hidden=\"true\" style=\"vertical-align: middle;\"></i></td><td style=\"padding-left: 1em;\"><p>\"#{fileTitle}\" already exists. Are you sure you want to overwrite it?</p></td></tr></tbody></table>"
								wait = yes
								confirmationDialog dialogTitle, dialogMessage, (accepted) =>
									if accepted
										confirmed = yes
										overwrite = yes
									$('#prompt-dialog').html('')
									@settings.callback confirmed, fileTitle, fsmType, overwrite, matchId
							else
								confirmed = yes

			hooks:
				onclose: ->
					return if wait
					$('#prompt-dialog').html('')
					@settings.callback confirmed, fileTitle, fsmType, overwrite, matchId
		), yes
		dialogInstance = alertify.fsmDialog($('#prompt-dialog').get(0))
								.set('title', title)
								.set('callback', cb)
								.set('parent', parentNode)
								.set('suffix', suffix)
	socDialog = (title, message, defaultValue, parentNode, suffix = '', cb) ->
		htmlContent = """<form action=\"#\" id=\"new-file-form\">
			<fieldset class="ui-helper-reset">
				<label for="file_title">#{message}</label>
				<input type="text" name="file_title" id="file_title" value="#{defaultValue}">
			</fieldset>
		</form>
		"""

		$('#prompt-dialog').html htmlContent

		$('#new-file-form').on 'submit', (e) ->
			e.preventDefault()
			e.stopPropagation()

		confirmed = no
		fileTitle = ''
		overwrite = no
		matchId = null
		seq = no
		dialogInstance = undefined
		wait = no
		alertify.socDialog or alertify.dialog 'socDialog', (->
			main: (content) ->
				@setContent content
			prepare: ->
				confirmed = no
				fileTitle = ''
				overwrite = no
				matchId = null
				seq = no
				wait = no
			setup: ->
					focus:
						element: '#file_title'
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
							text: 'Create'
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
				suffix: ''
				parent: undefined
			callback: (closeEvent) ->
						if closeEvent.index is 0
							fileTitle = $('#file_title').val()
							if fileTitle.trim() is ''
								closeEvent.cancel = yes
								return

							fileTitle = adjustFileSuffix fileTitle, @settings.suffix
							fileTitle = "#{fileTitle}#{@settings.suffix}"

							if matchId = hasChild(@settings.parent.id, fileTitle)
								dialogTitle = "Overwrite #{fileTitle}?"
								dialogMessage = "<table><tbody><tr><td><i class=\"fa fa-exclamation-triangle fa-2x\" aria-hidden=\"true\" style=\"vertical-align: middle;\"></i></td><td style=\"padding-left: 1em;\"><p>\"#{fileTitle}\" already exists. Are you sure you want to overwrite it?</p></td></tr></tbody></table>"
								wait = yes
								confirmationDialog dialogTitle, dialogMessage, (accepted) =>
									if accepted
										confirmed = yes
										overwrite = yes
									$('#prompt-dialog').html('')
									@settings.callback confirmed, fileTitle, overwrite, matchId
							else
								confirmed = yes

			hooks:
				onclose: ->
					return if wait
					$('#prompt-dialog').html('')
					@settings.callback confirmed, fileTitle, overwrite, matchId
		), yes
		dialogInstance = alertify.socDialog($('#prompt-dialog').get(0))
								.set('title', title)
								.set('callback', cb)
								.set('parent', parentNode)
								.set('suffix', suffix)

	sysDialog = (title, message, defaultValue, parentNode, suffix = '', cb) ->
		htmlContent = """<form action=\"#\" id=\"new-file-form\">
			<fieldset class="ui-helper-reset">
				<label for="file_title">#{message}</label>
				<input type="text" name="file_title" id="file_title" value="#{defaultValue}">
			</fieldset>
		</form>
		"""

		$('#prompt-dialog').html htmlContent

		$('#new-file-form').on 'submit', (e) ->
			e.preventDefault()
			e.stopPropagation()

		confirmed = no
		fileTitle = ''
		overwrite = no
		matchId = null
		seq = no
		dialogInstance = undefined
		wait = no
		alertify.sysDialog or alertify.dialog 'sysDialog', (->
			main: (content) ->
				@setContent content
			prepare: ->
				confirmed = no
				fileTitle = ''
				overwrite = no
				matchId = null
				seq = no
				wait = no
			setup: ->
					focus:
						element: '#file_title'
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
							text: 'Create'
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
				suffix: ''
				parent: undefined
			callback: (closeEvent) ->
						if closeEvent.index is 0
							fileTitle = $('#file_title').val()
							if fileTitle.trim() is ''
								closeEvent.cancel = yes
								return

							fileTitle = adjustFileSuffix fileTitle, @settings.suffix
							fileTitle = "#{fileTitle}#{@settings.suffix}"

							if matchId = hasChild(@settings.parent.id, fileTitle)
								dialogTitle = "Overwrite #{fileTitle}?"
								dialogMessage = "<table><tbody><tr><td><i class=\"fa fa-exclamation-triangle fa-2x\" aria-hidden=\"true\" style=\"vertical-align: middle;\"></i></td><td style=\"padding-left: 1em;\"><p>\"#{fileTitle}\" already exists. Are you sure you want to overwrite it?</p></td></tr></tbody></table>"
								wait = yes
								confirmationDialog dialogTitle, dialogMessage, (accepted) =>
									if accepted
										confirmed = yes
										overwrite = yes
									$('#prompt-dialog').html('')
									@settings.callback confirmed, fileTitle, overwrite, matchId
							else
								confirmed = yes

			hooks:
				onclose: ->
					return if wait
					$('#prompt-dialog').html('')
					@settings.callback confirmed, fileTitle, overwrite, matchId
		), yes
		dialogInstance = alertify.sysDialog($('#prompt-dialog').get(0))
								.set('title', title)
								.set('callback', cb)
								.set('parent', parentNode)
								.set('suffix', suffix)



	simulationDialog = (title, message, defaultValue, parentNode, suffix = '', cb) ->
		simulationTime = 1000
		htmlContent = """<form action=\"#\" id=\"new-file-form\">
			<fieldset class="ui-helper-reset">
				<label for="file_title">#{message}</label>
				<input type="text" name="file_title" id="file_title" value="#{defaultValue}">
				<br>
				<br>
				<label for="simulation_time">Maximum Simulation Time:</label>
				<input type="text" name="simulation_time" id="simulation_time" value="#{simulationTime}">
			</fieldset>
		</form>
		"""

		$('#prompt-dialog').html htmlContent

		$('#new-file-form').on 'submit', (e) ->
			e.preventDefault()
			e.stopPropagation()
		confirmed = no
		fileTitle = ''
		overwrite = no
		matchId = null
		dialogInstance = undefined
		wait = no
		alertify.simulationDialog or alertify.dialog 'simulationDialog',(->
			main: (content) ->
				@setContent content
			prepare: ->
				simulationTime = 1000
				confirmed = no
				fileTitle = ''
				overwrite = no
				matchId = null
				wait = no
			setup: ->
					focus:
						element: '#file_title'
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
							text: 'Simulate'
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
				suffix: ''
			callback: (closeEvent) ->
				if closeEvent.index is 0
					fileTitle = $('#file_title').val()
					if fileTitle.trim() is ''
						return closeEvent.cancel = yes

					simulationTime = parseInt($('#simulation_time').val())
					if isNaN(simulationTime)
						return closeEvent.cancel = yes

					fileTitle = adjustFileSuffix fileTitle, @settings.suffix
					fileTitle = "#{fileTitle}#{@settings.suffix}"

					if matchId = hasChild(getBuildFolderNode().id, fileTitle)
						dialogTitle = "Overwrite #{fileTitle}?"
						dialogMessage = "<table><tbody><tr><td><i class=\"fa fa-exclamation-triangle fa-2x\" aria-hidden=\"true\" style=\"vertical-align: middle;\"></i></td><td style=\"padding-left: 1em;\"><p>\"#{fileTitle}\" already exists. Are you sure you want to overwrite it?</p></td></tr></tbody></table>"
						wait = yes
						confirmationDialog dialogTitle, dialogMessage, (accepted) =>
							if accepted
								confirmed = yes
								overwrite = yes
							$('#prompt-dialog').html('')
							@settings.callback confirmed, fileTitle, overwrite, matchId, simulationTime
					else
						confirmed = yes

			hooks:
				onclose: ->
					return if wait
					$('#prompt-dialog').html('')
					@settings.callback confirmed, fileTitle, overwrite, matchId, simulationTime
		), yes
		dialogInstance = alertify.simulationDialog($('#prompt-dialog').get(0)).set('title', title).set('callback', cb).set('parent', parentNode).set('suffix', suffix)

	moduleDialog = (title, message, defaultValue, parentNode, suffix = '', cb) ->
		htmlContent = """<form action=\"#\" id=\"new-file-form\">
			<fieldset class="ui-helper-reset">
				<label for="file_title">#{message}</label>
				<input type="text" name="file_title" id="file_title" value="#{defaultValue}">
				<div class ="synth-checkbox-div synth-checkbox-div-inline">
					<input type="checkbox" id="seq" class="synth-checkbox">
					<label class="synth-checkbox-label" for="seq">Sequential</label>
				</div>
			</fieldset>
		</form>
		"""

		$('#prompt-dialog').html htmlContent
		$('#new-file-form').on 'submit', (e) ->
			e.preventDefault()
			e.stopPropagation()

		confirmed = no
		fileTitle = ''
		overwrite = no
		matchId = null
		seq = no
		dialogInstance = undefined
		wait = no
		alertify.moduleDialog or alertify.dialog 'moduleDialog',(->
			main: (content) ->
				@setContent content
			prepare: ->
				confirmed = no
				fileTitle = ''
				overwrite = no
				matchId = null
				seq = no
				wait = no
			setup: ->
					focus:
						element: '#file_title'
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
							text: 'Create'
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
				parent: undefined
				suffix: ''
			callback: (closeEvent) ->
						if closeEvent.index is 0
							fileTitle = $('#file_title').val()
							if fileTitle.trim() is ''
								closeEvent.cancel = yes
								return
							seq = $('#seq').is(':checked')
							fileTitle = adjustFileSuffix fileTitle, @settings.suffix
							fileTitle = "#{fileTitle}#{@settings.suffix}"


							if matchId = hasChild(@settings.parent.id, fileTitle)
								dialogTitle = "Overwrite #{fileTitle}?"
								dialogMessage = getWarnDialogHTML "\"#{fileTitle}\" already exists. Are you sure you want to overwrite it?"
								wait = yes
								confirmationDialog dialogTitle, dialogMessage, (accepted) =>
									if accepted
										confirmed = yes
										overwrite = yes
									$('#prompt-dialog').html('')
									@settings.callback confirmed, fileTitle, overwrite, matchId, seq
							else
								confirmed = yes

			hooks:
				onclose: ->
					return if wait
					$('#prompt-dialog').html('')
					@settings.callback confirmed, fileTitle, overwrite, matchId, seq
		), yes
		dialogInstance = alertify.moduleDialog($('#prompt-dialog').get(0)).set('title', title).set('callback', cb).set('parent', parentNode).set('suffix', suffix)

	ipDialog = (ips, cb) ->


		ipTree = []
		isIPAdded = {}
		for key, values of ips
			id = key
			path = id
			category =
				"id": id
				"parent": '#'
				"text": key
				data:
					index: -1
					category: '#'
					ip: ip
				"li_attr" :
					"class":"tree-item tree-file-item"
				type: 'node'
			unless isIPAdded[id]?
				ipTree.push category
				isIPAdded[id] = 1
			values.sort (firstIp, secondIp) ->
				if firstIp.title < secondIp.title
					-1
				else if firstIp.title > secondIp.title
					1
				else
					0
			for ip, index in values
				ipObj =
					id: ip.id
					parent: key
					text: "#{ip.title} by #{ip.owner}"
					data:
						index: index
						category: key
						ip: ip
					"li_attr" :
						"class":"tree-item tree-file-item"
					type: 'leaf'
				unless isIPAdded[ipObj.id]?
					ipTree.push ipObj
					isIPAdded[ipObj.id] = 1




		treeId = "#{Math.random().toString().split('.')[1]}-import-ip-tree"
		title = "Import IP Core"
		dialogMessage = """
			<form action=\"#\" id=\"new-file-form\">
				<fieldset class="ui-helper-reset">
					<div class="dialog-input-group">
						<label for="filter-ips">Filter: </label>
						<input type="text" name="filter-ips" id="filter-ips" value="">
					</div>
					<div>
						<div id=\"#{treeId}\"></div>
					</div>
				</fieldset>
			</form>
		"""
		$("#prompt-dialog").html dialogMessage
		nodeId = undefined
		$("##{treeId}").jstree(
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
						icon: '/images/tree-icons/Folder.png'
						valid_children: ['leaf']
					leaf:
						icon: '/images/tree-icons/ip.png'
						valid_children: []
			core:
				themes:
					name: 'default-dark'
					dots: no
				# multiple: yes
				check_callback: (operation, node, nodeParent, node_position, more) ->
					return yes
				data: ipTree
				).bind('dblclick.jstree', ((e) ->
					node = $(e.target).closest("li")
					if node.length
						nodeId = node.attr 'id'
						#if nodeId? and nodeId.trim() isnt ''
							#consol nodeId
				)).bind('select_node.jstree', ((e, data) ->
					if not searchClearead
						$('#files').jstree(yes).search('')
						searchClearead = yes
				)).bind('keypress', ((e, data) ->
					#if e.keyCode is 127
						#deleteFile(no)
				))

		handleFilter = (e) =>
			filterValue = $("#filter-ips").val().trim().toLowerCase()
			$("##{treeId}").jstree(yes).search(filterValue)

		$("#filter-ips").on 'input', handleFilter

		$('#new-file-form').on 'submit', (e) ->
			e.preventDefault()
			e.stopPropagation()

		confirmed = no
		ipId = ''
		ipName = ''
		ipTopModule = ''
		ipOwner = ''
		overwrite = no
		matchId = null
		wait = no
		alertify.ipDialog or alertify.dialog 'ipDialog',(->
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
						element: '#filter-ips'
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
							text: 'Import'
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
			callback: (closeEvent) ->
						if closeEvent.index is 0
							selectionIds = $("##{treeId}").jstree(yes).get_selected()
							ipId = ''
							for id in selectionIds
								node = $("##{treeId}").jstree(yes).get_node id
								if node and node.type is 'leaf'
									ip = node.data.ip
									ipId = ip.id
									ipName = ip.title
									ipTopModule = ip.topModule
									ipOwner = ip.owner

							if ipId.trim() isnt ''
								confirmed = yes

			hooks:
				onclose: ->
					return if wait
					$('#prompt-dialog').html('')
					@settings.callback confirmed, ipId, ipName, ipTopModule, ipOwner, overwrite, matchId
		), yes
		dialogInstance = alertify.ipDialog($('#prompt-dialog').get(0)).set('title', title).set('callback', cb)


	workspaceSettingsDialog = (currentThemeIndex, currentFontSize, cb) ->
		title = "Workspace Settings"

		optionsList = ""
		fontList = ""


		if currentThemeIndex is 0 # Dark
			optionsList = "<select class=\"prompt-select\" name=\"theme\" tabindex=\"0\" id=\"options-list\">\n<option value=\"0\" selected>Light</option>\n<option value=1>White</option>\n</select>"
		else #Light
			optionsList = "<select class=\"prompt-select\" name=\"options-list\" tabindex=\"0\" id=\"options-list\">\n<option value=\"0\">Dark</option>\n<option value=1 selected>Light</option>\n</select>"

		i = 6
		while i <= 60
			if i is currentFontSize
				fontList = "\t#{fontList}<option value=\"#{i}\" selected>#{i}</option>\n"
			else
				fontList = "\t#{fontList}<option value=\"#{i}\">#{i}</option>\n"
			if i < 16
				i++
			else if i < 32
				i += 2
			else if i <  48
				i += 4
			else
				i += 6

		fontList = "<select class=\"prompt-select\" name=\"font\" tabindex=\"0\" id=\"font\">\n#{fontList}\n</select>"

		htmlContent = """<form action=\"#\" id=\"new-file-form\">
			<fieldset class="ui-helper-reset">
				<div>
					<label for="theme">Theme:</label>
					#{optionsList}
				</div>
				<div>
					<label for="font">Font Size:</label>
					#{fontList}
				</div>
				<div class ="synth-checkbox-div">
					<input type="checkbox" id="default-settings" class="synth-checkbox">
					<label class="synth-checkbox-label" for="default-settings">Remember these settings for upcoming projects</label>
				</div>
			</fieldset>
		</form>
		"""

		$('#prompt-dialog').html htmlContent

		$('#new-file-form').on 'submit', (e) ->
			e.preventDefault()
			e.stopPropagation()

		confirmed = no
		themeIndex = null
		fontSize = null
		defaultSettings = no
		alertify.workspaceSettingsDialog or alertify.dialog 'workspaceSettingsDialog',(->
			main: (content) ->
				@setContent content
			prepare: ->
				confirmed = no
				themeIndex = null
				fontSize = null
				defaultSettings = no
			setup: ->
					focus:
						element: '#file_title'
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
							text: 'Save'
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
			callback: (closeEvent) ->
				if closeEvent.index is 0
					themeIndex = parseInt($('#options-list').val())
					fontSize = parseInt($('#font').val())
					if isNaN(fontSize) or isNaN(themeIndex)
						closeEvent.cancel = yes
						return
					defaultSettings = $('#default-settings').is(':checked')
					confirmed = yes

			hooks:
				onclose: ->
					$('#prompt-dialog').html('')
					@settings.callback confirmed, themeIndex, fontSize, defaultSettings
		), yes
		dialogInstance = alertify.workspaceSettingsDialog($('#prompt-dialog').get(0)).set('title', title).set('callback', cb)



	searchDialog = (title, message, defaultValue, cb) ->

		htmlContent = """<form action=\"#\" id=\"new-file-form\">
			<fieldset class="ui-helper-reset">
				<label for="search_query">#{message}</label>
				<input type="text" name="search_query" id="search_query" value="#{defaultValue}">
			</fieldset>
		</form>
		"""

		$('#prompt-dialog').html htmlContent

		$('#new-file-form').on 'submit', (e) ->
			e.preventDefault()
			e.stopPropagation()

		confirmed = no
		searchQuery = ''
		alertify.searchDialog or alertify.dialog 'searchDialog',(->
			main: (content) ->
				@setContent content
			prepare: ->
				confirmed = no
				searchQuery = ''
			setup: ->
					focus:
						element: '#search_query'
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
							text: 'Search'
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
			callback: (closeEvent) ->
						if closeEvent.index is 0
							searchQuery = $('#search_query').val()
							if searchQuery.trim() is ''
								closeEvent.cancel = yes
								return

							confirmed = yes

			hooks:
				onclose: ->
					$('#prompt-dialog').html('')
					@settings.callback confirmed, searchQuery
		), yes
		dialogInstance = alertify.searchDialog($('#prompt-dialog').get(0)).set('title', title).set('callback', cb)



	synthesisDialog = (stdcells, defaultName, cb) ->
		title = "Synthesize"
		optionsList = ""

		firstSelected = no

		for option in stdcells
			if not firstSelected
				optionsList = "\t#{optionsList}<option value=\"#{option.id}\">#{option.text}</option>\n"
				firstSelected = yes
			else
				optionsList = "\t#{optionsList}<option value=\"#{option.id}\">#{option.text}</option>\n"

		optionsList = "<select class=\"prompt-select\" name=\"options-list\" tabindex=\"0\" id=\"options-list\">\n#{optionsList}</select>"

		htmlContent = """<form action=\"#\" id=\"new-file-form\">
			<fieldset class="ui-helper-reset prompt-fieldset">
				<label for="file_title">Netlist File Name: </label>
				<input type="text" name="file_title" id="file_title" value="#{defaultName}" class="">
				<label for="options-list" class=\"prompt-label module-label\">Standard Cell Library</label>
				#{optionsList}
				<div class="synth-options" id="synth-options">
					<div class="synth-checkbox-div">
						<label for="clock_period">Clock Period: </label>
						<input type="text" name="clock_period" id="clock_period" value="1">
					</div>
					<div class="synth-checkbox-div">
						<label for="clock_period">Driving Cell Type: </label>
						<input type="text" name="dricing_cell_type" id="dricing_cell_type" value="DFFPOSX1">
					</div>
					<div class="synth-checkbox-div">
						<label for="clock_period">Load Cell Type: </label>
						<input type="text" name="load_cell_type" id="load_cell_type" value="0.1">
					</div>
					<div class="synth-checkbox-div">
						<input type="checkbox" id="synth-flatten" class="synth-checkbox">
						<label class="synth-checkbox-label" for="synth-flatten">Flatten the design.</label>
					</div>
					<!--div class ="synth-checkbox-div">
						<input type="checkbox" id="synth-purge" class="synth-checkbox" checked>
						<label class="synth-checkbox-label" for="synth-purge">purge</label>
					</div>
					<div class ="synth-checkbox-div">
						<input type="checkbox" id="synth-proc" class="synth-checkbox" checked>
						<label class="synth-checkbox-label" for="synth-proc">proc</label>
					</div>
					<div class ="synth-checkbox-div">
						<input type="checkbox" id="synth-memorymap" class="synth-checkbox" checked>
						<label class="synth-checkbox-label" for="synth-memorymap">memory_map</label>
					</div-->
				</div>
			</fieldset>
		</form>
		"""

		$('#prompt-dialog').html htmlContent
		$('#new-file-form').on 'submit', (e) ->
			e.preventDefault()
			e.stopPropagation()

		confirmed = no
		fileTitle = ''
		stdcell = (stdcells[0] or {id: 0}).id
		options =
			flatten: no
			purge: yes
			proc: yes
			clockPeriod: '1'
			drivingCell: 'DFFPOSX1'
			load: '0.1'

		overwrite = no
		matchId = null
		wait = no
		alertify.synthesisDialog or alertify.dialog 'synthesisDialog',(->
			main: (content) ->
				@setContent content
			prepare: ->
				confirmed = no
				fileTitle = ''
				stdcell = (stdcells[0] or {id: 0}).id
				options =
					flatten: no
					purge: yes
					proc: yes
				overwrite = no
				matchId = null
				wait = no
			setup: ->
					focus:
						element: '#file_title'
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
							text: 'Synthesize'
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
			callback: (closeEvent) ->
						if closeEvent.index is 0
							fileTitle = $('#file_title').val()
							if fileTitle.trim() is ''
								closeEvent.cancel = yes
								return
							stdcell = $('#options-list').val()
							if stdcell.trim() is ''
								closeEvent.cancel = yes
								return

							fileTitle = adjustFileSuffix fileTitle, '.v'
							fileTitle = "#{fileTitle}.v"

							options.clockPeriod =  $('#clock_period').val()
							options.drivingCell = $('#dricing_cell_type').val()
							options.load = $('#load_cell_type').val()
							options.flatten = $('#synth-flatten').is(':checked')
							# options.purge = $('#synth-purge').is(':checked')
							# options.proc = $('#synth-proc').is(':checked')
							# options.memorymap = $('#synth-memorymap').is(':checked')

							if matchId = hasChild(getBuildFolderNode().id, fileTitle)
								dialogTitle = "Overwrite #{fileTitle}?"
								dialogMessage = getWarnDialogHTML "\"#{fileTitle}\" already exists. Are you sure you want to overwrite it?"
								wait = yes
								confirmationDialog dialogTitle, dialogMessage, (accepted) =>
									if accepted
										confirmed = yes
										overwrite = yes
									$('#prompt-dialog').html('')
									@settings.callback confirmed, fileTitle, stdcell, options, overwrite, matchId
							else
								confirmed = yes

			hooks:
				onclose: ->
					return if wait
					$('#prompt-dialog').html('')
					@settings.callback confirmed, fileTitle, stdcell, options, overwrite, matchId
		), yes
		dialogInstance = alertify.synthesisDialog($('#prompt-dialog').get(0)).set('title', title).set('callback', cb)



	staDialog = (stdcells, cb) ->

		return comingSoon 'Static Timing Analysis'

		optionsList = ""

		firstSelected = no

		for option in stdcells
			if not firstSelected
				optionsList = "\t#{optionsList}<option value=\"#{option.id}\">#{option.text}</option>\n"
				firstSelected = yes
			else
				optionsList = "\t#{optionsList}<option value=\"#{option.id}\">#{option.text}</option>\n"

		optionsList = "<select class=\"prompt-select\" name=\"options-list\" tabindex=\"0\" id=\"options-list\">\n#{optionsList}</select>"

		htmlContent = """<form action=\"#\" id=\"new-file-form\">
			<fieldset class="ui-helper-reset prompt-fieldset">
				<label for="file_title">Report File: </label>
				<input type="text" name="file_title" id="file_title" value="report.sta" class="ui-widget-content ui-corner-all">
				<label for="options-list" class=\"prompt-label module-label\">Standard Cell Library</label>
				#{optionsList}
				<div class="dialog-input-group">
					<label class="dialog-singleline-label" for="timing_const">Timing Constraints (JSON): </label>
					<textarea class="dialog-textarea dialog-sta-textarea" name="timing_const" id="timing_const" value="" class="ui-widget-content ui-corner-all" placeholder=""></textarea>
				</div>
				<div class="dialog-input-group">
					<label class="dialog-singleline-label" for="clock_skews">Clock Skews (JSON): </label>
					<textarea class="dialog-textarea dialog-sta-textarea" name="clock_skews" id="clock_skews" value="" class="ui-widget-content ui-corner-all" placeholder=""></textarea>
				</div>
				<div class="dialog-input-group">
					<label class="dialog-singleline-label" for="net_cap">Net Capacitances (JSON): </label>
					<textarea class="dialog-textarea dialog-sta-textarea" name="net_cap" id="net_cap" value="" class="ui-widget-content ui-corner-all" placeholder=""></textarea>
				</div>
			</fieldset>
		</form>
		"""

		$("#prompt-dialog").html htmlContent

		$('#timing_const').attr 'placeholder', """Example:
		{
		  "clock": 2.5,
		  "input_slew": {
			"___input_clk": {
			  "rise_transition": 0.06,
			  "fall_transition": 0.02
			},
			"___input_a[0]": {
			  "rise_transition": 0.15,
			  "fall_transition": 0.2
			},
			"___input_a[1]": {
			  "rise_transition": 0.03,
			  "fall_transition": 0.02
			}
		  },
		  "input_delays": {
			"___input_a[0]": {
			  "cell_rise": 0.25,
			  "cell_fall": 0.4
			},
			"___input_a[1]": {
			  "cell_rise": 0.5,
			  "cell_fall": 0.8
			}
		  },
		  "output_capacitance_load": {
			"___output_b": {
			  "rise_capacitance": 0.3,
			  "fall_capacitance": 0.2
			}
		  },
		  "output_delays": {
			"___output_b": {
			  "cell_rise": 0.4,
			  "cell_fall": 0.3
			}
		  }
		}
	"""
		$('#clock_skews').attr 'placeholder', """Example:
		{
		  "_7FF_": 0.02,
		  "_8FF_": 0.02,
		  "_9FF_": 0.03
		}
		"""

		$('#net_cap').attr 'placeholder', """Example:
		{
		  "c[0]": {
			"_5_": {
			  "A": 0.03
			}
		  },
		  "c[1]": {
			"_5_": {
			  "B": 0.03
			}
		  },
		  "c[2]": {
			"_6_": {
			  "A": 0.04
			}
		  },
		  "c[3]": {
			"_6_": {
			  "B": 0.04
			}
		  },
		  "c[4]": {
			"_7FF_": {
			  "D": 0.02
			}
		  },
		  "c[5]": {
			"_8FF_": {
			  "D": 0.01
			}
		  },
		  "c[6]": {
			"_9FF_": {
			  "D": 0.05
			}
		  },
		  "c[7]": {
			"_10_": {
			  "B": 0.04
			}
		  },
		  "c[8]": {
			"_10_": {
			  "A": 0.03
			}
		  },
		  "b": {
			"___output_b": {
			  "A": 0.08
			}
		  }

		}
		"""

		confirmed = no
		fileTitle = ''
		stdcell = (stdcells[0] or {id: 0}).id
		options =
			timing: {}
			clock: {}
			net: {}
		overwrite = no
		matchId = null

		$("#prompt-dialog").dialog
			resizable: no
			modal: yes
			title: 'Enter STA options..'
			height: 600
			width: 380
			buttons:
				'Analyze': () ->
					fileTitle = $('#file_title').val()
					return if fileTitle.trim() is ''
					stdcell = $('#options-list').val()
					return if stdcell.trim() is ''

					fileTitle = adjustFileSuffix fileTitle, '.sta'
					fileTitle = "#{fileTitle}.sta"

					options.timing = $('#timing_const').val()
					options.clock = $('#clock_skews').val()
					options.net = $('#net_cap').val()

					thisContainer = $(@)

					if matchId = hasChild(getBuildFolderNode().id, fileTitle)
						dialogTitle = "Overwrite #{fileTitle}"
						dialogMessage = getWarnDialogHTML "\"#{fileTitle}\" already exists. Are you sure you want to overwrite it?"

						confirmationDialog dialogTitle, dialogMessage, (accepted) ->
							if accepted
								confirmed = yes
								overwrite = yes
								thisContainer.dialog('close')
					else
						confirmed = yes
						thisContainer.dialog('close')

				'Cancel': () ->
					$(@).dialog('close')

			close: () ->
				$('#prompt-dialog').html('')
				cb confirmed, fileTitle, stdcell, options, overwrite, matchId

		keyPressHandler = (e) ->
			if e.keyCode is 13
				createButton = $('#prompt-dialog').parent().find '.ui-button:contains(\"Select\")'
				createButton.click()
				e.preventDefault()
				e.stopPropagation()

		$('#prompt-dialog').parent().keypress keyPressHandler

		$('#options-list').selectmenu().addClass 'prompt-overflow'


		$('#prompt-dialog').parent().focus()

	nameAndOptionsDialog = (title, nameMessage, defaultValue, optionsMessage, options, parentNode, suffix = '', cb) ->
		optionsList = ""

		firstSelected = no

		for option in options
			if not firstSelected
				optionsList = "\t#{optionsList}<option value=\"#{option}\">#{option}</option>\n"
				firstSelected = yes
			else
				optionsList = "\t#{optionsList}<option value=\"#{option}\">#{option}</option>\n"

		optionsList = "<select class=\"prompt-select\" name=\"options-list\" tabindex=\"0\" id=\"options-list\">\n#{optionsList}</select>"

		htmlContent = """<form action=\"#\" id=\"new-file-form\">
			<fieldset class="ui-helper-reset prompt-fieldset">
				<label for="file_title">#{nameMessage}</label>
				<input type="text" name="file_title" id="file_title" value="#{defaultValue}">
				<label for="options-list" class=\"prompt-label module-label\">#{optionsMessage}</label>
				#{optionsList}
			</fieldset>
		</form>
		"""

		$("#prompt-dialog").html htmlContent

		confirmed = no
		fileTitle = ''
		moduleName = ''
		overwrite = no
		matchId = null
		wait = no
		alertify.nameAndOptionsDialog or alertify.dialog 'nameAndOptionsDialog',(->
			main: (content) ->
				@setContent content
			prepare: ->
				confirmed = no
				fileTitle = ''
				moduleName = ''
				overwrite = no
				matchId = null
				wait = no
			setup: ->
					focus:
						element: '#file_title'
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
							text: 'Create'
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
				parent: undefined
			callback: (closeEvent) ->
						if closeEvent.index is 0
							fileTitle = $('#file_title').val()
							if fileTitle.trim() is ''
								closeEvent.cancel = yes
								return
							moduleName = $('#options-list').val()
							if moduleName.trim() is ''
								closeEvent.cancel = yes
								return

							fileTitle = adjustFileSuffix fileTitle, suffix
							fileTitle = "#{fileTitle}#{suffix}"
							if matchId = hasChild(@settings.parent.id, fileTitle)
								dialogTitle = "Overwrite #{fileTitle}?"
								dialogMessage = getWarnDialogHTML "\"#{fileTitle}\" already exists. Are you sure you want to overwrite it?"
								wait = yes
								confirmationDialog dialogTitle, dialogMessage, (accepted) =>
									if accepted
										confirmed = yes
										overwrite = yes
									$('#prompt-dialog').html('')
									@settings.callback confirmed, fileTitle, moduleName, overwrite, matchId
							else
								confirmed = yes

			hooks:
				onclose: ->
					return if wait
					$('#prompt-dialog').html('')
					@settings.callback confirmed, fileTitle, moduleName, overwrite, matchId
		), yes
		dialogInstance = alertify.nameAndOptionsDialog($('#prompt-dialog').get(0)).set('title', title).set('callback', cb).set('parent', parentNode)




	testbenchDialog = (title, optionsMessage, options, cb) ->

		optionsList = ""

		firstSelected = no

		for option in options
			if not firstSelected
				optionsList = "\t#{optionsList}<option value=\"#{option.id}\">#{option.text}</option>\n"
				firstSelected = yes
			else
				optionsList = "\t#{optionsList}<option value=\"#{option.id}\">#{option.text}</option>\n"

		optionsList = "<select class=\"prompt-select\" name=\"options-list\" tabindex=\"0\" id=\"options-list\">\n#{optionsList}</select>"

		htmlContent = """<form action=\"#\" id=\"new-file-form\">
			<fieldset class="ui-helper-reset prompt-fieldset">
				<label for="options-list" class=\"prompt-label\">#{optionsMessage}</label>
				#{optionsList}
				<div class ="synth-checkbox-div">
					<input type="checkbox" id="blank-tb" class="synth-checkbox">
					<label class="synth-checkbox-label" for="blank-tb">Create Blank Testbench</label>
				</div>
			</fieldset>
		</form>
		"""

		$('#prompt-dialog').html htmlContent

		$('#new-file-form').on 'submit', (e) ->
			e.preventDefault()
			e.stopPropagation()


		$('#prompt-dialog').html htmlContent
		$('#new-file-form').on 'submit', (e) ->
			e.preventDefault()
			e.stopPropagation()

		confirmed = no
		fileId = null
		fileName = ''
		isBlank = no
		alertify.testbenchDialog or alertify.dialog 'testbenchDialog',(->
			main: (content) ->
				@setContent content
			prepare: ->
				confirmed = no
				fileId = null
				fileName = ''
				isBlank = no
			setup: ->
					focus:
						element: '#file_title'
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
							text: 'Next'
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
			callback: (closeEvent) ->
						if closeEvent.index is 0
							fileId = $('#options-list').val()
							if not fileId? or fileId.trim() is ''
								closeEvent.cancel = yes
								return
							fileName = $("#options-list").children("option").filter(":selected").text()


							isBlank = $('#blank-tb').is(':checked')


							confirmed = yes

			hooks:
				onclose: ->
					$('#prompt-dialog').html('')
					@settings.callback confirmed, fileId, fileName, isBlank
				onshow: ->
					$('#blank-tb').change (e)->
						if $('#blank-tb').is(':checked')
							$('#options-list').prop 'disabled', yes
						else
							$('#options-list').prop 'disabled', no
		), yes
		dialogInstance = alertify.testbenchDialog($('#prompt-dialog').get(0)).set('title', title).set('callback', cb)

	bitstreamDialog = (files, defaultName, cb) ->
		title = 'Generate Bitstream (WIP)'
		optionsList = ""

		firstSelected = no

		for option in files
			if not firstSelected
				optionsList = "\t#{optionsList}<option value=\"#{option.id}\">#{option.text}</option>\n"
				firstSelected = yes
			else
				optionsList = "\t#{optionsList}<option value=\"#{option.id}\">#{option.text}</option>\n"

		optionsList = "<select class=\"prompt-select\" name=\"options-list\" tabindex=\"0\" id=\"options-list\">\n#{optionsList}</select>"

		htmlContent = """<form action=\"#\" id=\"new-file-form\">
			<fieldset class="ui-helper-reset prompt-fieldset">
				<label for="file_title">File Name: </label>
				<input type="text" name="file_title" id="file_title" value="#{defaultName}">
				<label for="options-list" class=\"prompt-label\">Constrains File: </label>
				#{optionsList}
			</fieldset>
		</form>
		"""

		$('#prompt-dialog').html htmlContent

		$('#new-file-form').on 'submit', (e) ->
			e.preventDefault()
			e.stopPropagation()


		$('#prompt-dialog').html htmlContent
		$('#new-file-form').on 'submit', (e) ->
			e.preventDefault()
			e.stopPropagation()

		confirmed = no
		pcfId = null
		fileTitle = ''
		wait = no
		alertify.bitstreamDialog or alertify.dialog 'bitstreamDialog',(->
			main: (content) ->
				@setContent content
			prepare: ->
				confirmed = no
				pcfId = null
				fileTitle = ''
				isBlank = no
				wait = no
			setup: ->
					focus:
						element: '#file_title'
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
							text: 'Generate'
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
			callback: (closeEvent) ->
						if closeEvent.index is 0
							fileTitle = $('#file_title').val().trim()
							if fileTitle.trim() is ''
								closeEvent.cancel = yes
								return
							fileTitle = adjustFileSuffix fileTitle, ".bin"
							fileTitle = "#{fileTitle.trim()}.bin"
							pcfId = $('#options-list').val()
							if not pcfId? or pcfId.trim() is ''
								closeEvent.cancel = yes
								return

							if matchId = hasChild(buildFolderId, fileTitle)
								dialogTitle = "Overwrite #{fileTitle}?"
								dialogMessage = getWarnDialogHTML "\"#{fileTitle}\" already exists. Are you sure you want to overwrite it?"
								wait = yes
								confirmationDialog dialogTitle, dialogMessage, (accepted) =>
									if accepted
										confirmed = yes
										overwrite = yes
									$('#prompt-dialog').html('')
									@settings.callback confirmed, fileTitle, pcfId, yes, matchId
							else
								confirmed = yes

			hooks:
				onclose: ->
					return if wait
					$('#prompt-dialog').html('')
					@settings.callback confirmed, fileTitle, pcfId
				onshow: ->
		), yes
		dialogInstance = alertify.bitstreamDialog($('#prompt-dialog').get(0)).set('title', title).set('callback', cb)

	pcfDialog = (title, boards, parentNode, cb) ->

		optionsList = ""

		firstSelected = no

		for option in boards
			if not firstSelected
				optionsList = "\t#{optionsList}<option value=\"#{option.id}\">#{option.model}</option>\n"
				firstSelected = yes
			else
				optionsList = "\t#{optionsList}<option value=\"#{option.id}\">#{option.model}</option>\n"

		optionsList = "<select class=\"prompt-select\" name=\"options-list\" tabindex=\"0\" id=\"options-list\">\n#{optionsList}</select>"

		htmlContent = """<form action=\"#\" id=\"new-file-form\">
			<fieldset class="ui-helper-reset prompt-fieldset">
				<label for="options-list" class=\"prompt-label\">Board Model</label>
				#{optionsList}
				<div class ="synth-checkbox-div">
					<input type="checkbox" id="blank-tb" class="synth-checkbox">
					<label class="synth-checkbox-label" for="blank-tb">Create Blank Testbench</label>
				</div>
			</fieldset>
		</form>
		"""

		$('#prompt-dialog').html htmlContent

		$('#new-file-form').on 'submit', (e) ->
			e.preventDefault()
			e.stopPropagation()


		$('#prompt-dialog').html htmlContent
		$('#new-file-form').on 'submit', (e) ->
			e.preventDefault()
			e.stopPropagation()

		confirmed = no
		fileId = null
		fileName = ''
		isBlank = no
		alertify.testbenchDialog or alertify.dialog 'testbenchDialog',(->
			main: (content) ->
				@setContent content
			prepare: ->
				confirmed = no
				fileId = null
				fileName = ''
				isBlank = no
			setup: ->
					focus:
						element: '#file_title'
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
							text: 'Next'
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
			callback: (closeEvent) ->
						if closeEvent.index is 0
							fileId = $('#options-list').val()
							if not fileId? or fileId.trim() is ''
								closeEvent.cancel = yes
								return
							fileName = $("#options-list").children("option").filter(":selected").text()


							isBlank = $('#blank-tb').is(':checked')


							confirmed = yes

			hooks:
				onclose: ->
					$('#prompt-dialog').html('')
					@settings.callback confirmed, fileId, fileName, isBlank
				onshow: ->
					$('#blank-tb').change (e)->
						if $('#blank-tb').is(':checked')
							$('#options-list').prop 'disabled', yes
						else
							$('#options-list').prop 'disabled', no
		), yes
		dialogInstance = alertify.testbenchDialog($('#prompt-dialog').get(0)).set('title', title).set('callback', cb)

	compilerDialog = (files, defaultName, cb) ->
		title = 'Compile Software Files (WIP)'

		htmlContent = """<form action=\"#\" id=\"new-file-form\">
			<fieldset class="ui-helper-reset prompt-fieldset">
				<label for="file_title">File Name: </label>
				<input type="text" name="file_title" id="file_title" value="#{defaultName}">
			</fieldset>
		</form>
		"""

		$('#prompt-dialog').html htmlContent

		$('#new-file-form').on 'submit', (e) ->
			e.preventDefault()
			e.stopPropagation()


		$('#prompt-dialog').html htmlContent
		$('#new-file-form').on 'submit', (e) ->
			e.preventDefault()
			e.stopPropagation()

		confirmed = no
		fileTitle = ''
		wait = no
		alertify.bitstreamDialog or alertify.dialog 'bitstreamDialog',(->
			main: (content) ->
				@setContent content
			prepare: ->
				confirmed = no
				pcfId = null
				fileTitle = ''
				isBlank = no
				wait = no
			setup: ->
					focus:
						element: '#file_title'
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
							text: 'Compile'
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
			callback: (closeEvent) ->
						if closeEvent.index is 0
							fileTitle = $('#file_title').val().trim()
							if fileTitle.trim() is ''
								closeEvent.cancel = yes
								return
							fileTitle = adjustFileSuffix fileTitle, ".obj"
							fileTitle = "#{fileTitle.trim()}.obj"

							if matchId = hasChild(buildFolderId, fileTitle)
								dialogTitle = "Overwrite #{fileTitle}?"
								dialogMessage = getWarnDialogHTML "\"#{fileTitle}\" already exists. Are you sure you want to overwrite it?"
								wait = yes
								confirmationDialog dialogTitle, dialogMessage, (accepted) =>
									if accepted
										confirmed = yes
										overwrite = yes
									$('#prompt-dialog').html('')
									@settings.callback confirmed, fileTitle, yes, matchId
							else
								confirmed = yes

			hooks:
				onclose: ->
					return if wait
					$('#prompt-dialog').html('')
					@settings.callback confirmed, fileTitle
				onshow: ->
		), yes
		dialogInstance = alertify.bitstreamDialog($('#prompt-dialog').get(0)).set('title', title).set('callback', cb)




	netlistSimulationDialog = (defaultName, testbenches, stdcells, parentNode, suffix = '', cb) ->
		title = "Simulate Netlist"
		simulationTime = 1000
		optionsList = ""

		firstSelected = no

		for option in testbenches
			if not firstSelected
				optionsList = "\t#{optionsList}<option value=\"#{option.id}\">#{option.text}</option>\n"
				firstSelected = yes
			else
				optionsList = "\t#{optionsList}<option value=\"#{option.id}\">#{option.text}</option>\n"

		optionsList = "<select class=\"prompt-select\" name=\"options-list\" tabindex=\"0\" id=\"options-list\">\n#{optionsList}</select>"

		stdcellsLists = ""

		firstStdSelected = no

		for option in stdcells
			if not firstStdSelected
				stdcellsLists = "\t#{stdcellsLists}<option value=\"#{option.id}\">#{option.text}</option>\n"
				firstStdSelected = yes
			else
				stdcellsLists = "\t#{stdcellsLists}<option value=\"#{option.id}\">#{option.text}</option>\n"

		stdcellsLists = "<select class=\"prompt-select\" name=\"stdcells-list\" tabindex=\"0\" id=\"stdcells-list\">\n#{stdcellsLists}</select>"

		htmlContent = """<form action=\"#\" id=\"new-file-form\">
			<fieldset class="ui-helper-reset prompt-fieldset">
				<label for="file_title">Simulation File Name: </label>
				<input type="text" name="file_title" id="file_title" value="#{defaultName}">
				<label for="options-list" class=\"prompt-label module-label\">Testbench: </label>
				#{optionsList}
				<label for="stdcells-list" class=\"prompt-label module-label\">Standard Cell Library: </label>
				#{stdcellsLists}
				<div class="form-group">
					<label for="simulation_time">Maximum Simulation Time:</label>
					<input type="text" name="simulation_time" id="simulation_time" value="#{simulationTime}">
				</div>
			</fieldset>
		</form>
		"""

		$('#prompt-dialog').html htmlContent
		$('#new-file-form').on 'submit', (e) ->
			e.preventDefault()
			e.stopPropagation()

		confirmed = no
		fileTitle = ''
		stdcell = ''
		testbench = ''
		overwrite = no
		matchId = null
		wait = no
		alertify.netlistSimulationDialog or alertify.dialog 'netlistSimulationDialog',(->
			main: (content) ->
				@setContent content
			prepare: ->
				confirmed = no
				fileTitle = ''
				stdcell = ''
				testbench = ''
				overwrite = no
				matchId = null
				wait = no
				simulationTime = 1000
			setup: ->
					focus:
						element: '#file_title'
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
							text: 'Simulate'
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
				suffix: ''
			callback: (closeEvent) ->
						if closeEvent.index is 0
							fileTitle = $('#file_title').val()
							if fileTitle.trim() is ''
								closeEvent.cancel = yes
								return
							testbench = $('#options-list').val()
							if testbench.trim() is ''
								closeEvent.cancel = yes
								return
							stdcell = $('#stdcells-list').val()
							if stdcell.trim() is ''
								closeEvent.cancel = yes
								return
							simulationTime = parseInt($('#simulation_time').val())

							if isNaN(simulationTime)
								closeEvent.cancel = yes
								return
							fileTitle = adjustFileSuffix fileTitle, @settings.suffix
							fileTitle = "#{fileTitle}#{@settings.suffix}"

							if matchId = hasChild(getBuildFolderNode().id, fileTitle)
								dialogTitle = "Overwrite #{fileTitle}?"
								dialogMessage = getWarnDialogHTML "\"#{fileTitle}\" already exists. Are you sure you want to overwrite it?"
								wait = yes
								confirmationDialog dialogTitle, dialogMessage, (accepted) =>
									if accepted
										confirmed = yes
										overwrite = yes
									$('#prompt-dialog').html('')
									@settings.callback confirmed, fileTitle, testbench, stdcell, overwrite, matchId, simulationTime
							else
								confirmed = yes

			hooks:
				onclose: ->
					return if wait
					$('#prompt-dialog').html('')
					@settings.callback confirmed, fileTitle, testbench, stdcell, overwrite, matchId, simulationTime
		), yes
		dialogInstance = alertify.netlistSimulationDialog($('#prompt-dialog').get(0)).set('title', title).set('callback', cb).set('parent', parentNode).set('suffix', suffix)


	newIP = (isContext = no) ->
		targetNode = getParentTargetNode isContext
		return if not targetNode.type in ['folder', 'root']
		loadingOn 'Retrieving list of available IP Cores..'
		getIPs (err, ips) ->
			loadingOff()
			if err
				loadingOff()
				displayError err
			else
				ipDialog ips, (confirmed, ipId, ipName, ipTopModule, ipOwner, overwrite, matchId) ->
					return unless confirmed
					fileDialog 'New IP Core', 'IP Core Name: ', ipName, targetNode, '.ip', (confirmed, fileName, overwrite, matchId) ->
						return unless confirmed

						loadingOn('Creating IP Core module..')



						request Urls.ajax, 'POST', {
							action: 'import'
							type: 'ip'
							name: fileName
							parent: targetNode.id
							overwrite: overwrite
							content: ipId
						}, ((res) ->
							loadingOff()
							ipContent = res.content
							fileName = res.fileName
							fileId = res.fileId
							folderId = res.parentId
							fileType = res.fileType
							if overwrite
								deleteNode matchId
							newNode = createNode fileId, folderId, fileName, fileType
							###createAceTab newNode, fileContent
							modules = extractModules fileContent###
							deleteChildren fileId
							###for module in modules
								moduleId = "#{module}_#{fileName}_#{module}_#{(new Date).valueOf()}_#{('' + Math.random()).split('.')[1]}"
								createNode moduleId, fileId, module, 'module'###
							loadingOff()

						), (error) ->
							loadingOff()
							displayError error
	newPCF = (isContext = no) ->
		targetNode = getParentTargetNode isContext
		return if not targetNode.type in ['folder', 'root']
		if topModule.trim() is ''
			return displayError error: 'You must set top module first.'
		loadingOn 'Retrieving list of board models..'
		getBoardsInfo (err, boards) ->
			loadingOff()
			if err
				loadingOff()
				displayError err
			else
				pcfDialog 'New Pin Constraints File', boards, targetNode, (confirmed, fileName, boardId, boardName, overwrite, matchId) ->
					return unless confirmed
					loadingOn('Creating Pin Constraints File..')

					fileName = adjustFileSuffix fileName, '.pcf'
					fileName = "#{fileName}.pcf"

					request Urls.ajax, 'POST', {
						action: 'create'
						type: 'pcf'
						name: fileName
						parent: targetNode.id
						overwrite: overwrite
						boardId: boardId
						boardName: boardName
					}, ((res) ->
						fileContent = res.content
						fileName = res.fileName
						fileId = res.fileId
						folderId = res.parentId
						fileType = res.fileType
						if overwrite
							deleteNode matchId
						newNode = createNode fileId, folderId, fileName, fileType
						createPCFEditor newNode, fileContent
						loadingOff()

					), (error) ->
						loadingOff()
						displayError error
	newVerilog = (isContext = no) ->
		targetNode = getParentTargetNode isContext
		return if not targetNode.type in ['folder', 'root']
		moduleDialog 'New Verilog Module', 'Module Name: ', '', targetNode, '.v', (confirmed, fileName, overwrite, matchId, seq) ->
			return unless confirmed

			loadingOn('Creating verilog module..')

			fileName = adjustFileSuffix fileName, '.v'
			fileName = "#{fileName}.v"

			request Urls.ajax, 'POST', {
				action: 'create'
				type: 'verilog'
				name: fileName
				parent: targetNode.id
				overwrite: overwrite
				seq: seq or no
			}, ((res) ->
				fileContent = res.content
				fileName = res.fileName
				fileId = res.fileId
				folderId = res.parentId
				fileType = res.fileType
				if overwrite
					deleteNode matchId
				newNode = createNode fileId, folderId, fileName, fileType
				createAceTab newNode, fileContent
				modules = extractModules fileContent
				deleteChildren fileId
				for module in modules
					moduleId = "#{module}_#{fileName}_#{module}_#{(new Date).valueOf()}_#{('' + Math.random()).split('.')[1]}"
					createNode moduleId, fileId, module, 'module'

				loadingOff()

			), (error) ->
				loadingOff()
				displayError error

	newVerilogFromFSM = (verilogCode) ->
		fsm = getActiveFSM()
		return unless fsm? and fsm
		fsmTab = fsm.tab
		fileId = fsmTab.data 'fileId'
		fileNode = getNodeById(fileId)
		targetNode = getNodeById(fileNode.parent)

		fileDialog 'Export Verilog File', 'File Name: ', '', targetNode, '.v', (confirmed, fileName, overwrite, matchId) ->
			return unless confirmed

			loadingOn('Creating Finite State Machine..')

			fileName = adjustFileSuffix fileName, '.v'
			fileName = "#{fileName}.v"
			request Urls.ajax, 'POST', {
				action: 'import'
				type: 'verilog'
				name: fileName
				parent: targetNode.id
				overwrite: overwrite
				content: verilogCode
			}, ((res) ->
				fileContent = res.content
				fileName = res.fileName
				fileId = res.fileId
				folderId = res.parentId
				fileType = res.fileType
				if overwrite
					deleteNode matchId
				newNode = createNode fileId, folderId, fileName, fileType
				createAceTab newNode, fileContent
				modules = extractModules fileContent
				deleteChildren fileId
				for module in modules
					moduleId = "#{module}_#{fileName}_#{module}_#{(new Date).valueOf()}_#{('' + Math.random()).split('.')[1]}"
					createNode moduleId, fileId, module, 'module'

				loadingOff()

			), (error) ->
				loadingOff()
				displayError error

	importVerilogFile = (moduleName, moduleContent, parent, overwrite = no, cb) ->
		if typeof overwrite is 'function'
			cb = overwrite
			overwrite = no
		request Urls.ajax, 'POST', {
			action: 'import'
			type: 'verilog'
			name: moduleName
			parent: parent
			overwrite: overwrite
			content: moduleContent
		}, ((res) ->
			fileContent = res.content
			fileName = res.fileName
			fileId = res.fileId
			folderId = res.parentId
			fileType = res.fileType
			if matchId = hasChild folderId, fileName
				deleteNode matchId
			cb null, fileName, fileId, fileContent, folderId, fileType
		), (error) ->
			cb error

	newTestbench = (isContext = no) ->
		targetNode = getParentTargetNode isContext
		return if not targetNode.type in ['folder', 'root']


		loadingOn('Retrieving verilog files..')
		getVerilogFiles (err, modules) ->
			loadingOff()
			if err
				displayError err
			else
				testbenchDialog 'New Verilog Testbench', 'Module File Name: ', modules, (confirmed, fileId, fileName, isBlank) ->
						return unless confirmed
						if isBlank
							fileDialog 'New Verilog Testbench', 'Testbench Name: ', '', targetNode, '.v', (confirmed, fileName, overwrite, matchId) ->
								fileName = adjustFileSuffix fileName, '.v'
								testbenchName = "#{fileName}.v"
								request Urls.ajax, 'POST', {
									action: 'create'
									type: 'testbench'
									name: testbenchName
									blank: yes
									parent: targetNode.id
									overwrite: overwrite
								}, ((res) ->
									fileContent = res.content
									fileName = res.fileName
									fileId = res.fileId
									folderId = res.parentId
									fileType = res.fileType
									if overwrite
										deleteNode matchId
									newNode = createNode fileId, folderId, fileName, fileType
									createAceTab newNode, fileContent

									loadingOff()

								), (error) ->
									loadingOff()
									displayError error
						else
							fileName = adjustFileSuffix fileName, '.v'
							testbenchName = "#{fileName}_tb.v"

							loadingOn('Reading verilog file..')
							retrieveFile fileId, (err, fileContent, fileName, fileType, fileModules) ->
								loadingOff()
								if err
									return displayError err
								else
									return unless fileType in ['verilog', 'exverilog']
									nameAndOptionsDialog 'New Verilog Testbench', 'Testbench Name: ', testbenchName, 'Target Module: ', fileModules, targetNode, '.v', (confirmed, fileTitle, moduleName, overwrite, matchId) ->
										return unless confirmed
										fileTitle = adjustFileSuffix fileTitle, '.v'
										testbenchName = "#{fileTitle}.v"
										clearAllGrids()

										loadingOn('Creating testbench..')

										request Urls.ajax, 'POST', {
											action: 'create'
											type: 'testbench'
											name: testbenchName
											source: fileId
											module: moduleName
											parent: targetNode.id
											overwrite: overwrite
										}, ((res) ->
											fileContent = res.content
											fileName = res.fileName
											fileId = res.fileId
											folderId = res.parentId
											fileType = res.fileType
											if overwrite
												deleteNode matchId
											newNode = createNode fileId, folderId, fileName, fileType
											createAceTab newNode, fileContent

											loadingOff()

										), (error, a, b) ->
											loadingOff()
											displayError error
											if error.errors
												error.errors.forEach (err) ->
													logError err
												setLogTab 1

	newFSM = (isContext = no) ->
		targetNode = getParentTargetNode isContext
		return if not targetNode.type in ['folder', 'root']
		fsmDialog 'New Finite State Machine', 'FSM Name: ', '', targetNode, '.fsm', (confirmed, fileName, fsmType, overwrite, matchId) ->
			return unless confirmed
			fileName = adjustFileSuffix fileName, '.fsm'
			fileName = "#{fileName}.fsm"

			request Urls.ajax, 'POST', {
				action: 'create'
				type: 'fsm'
				name: fileName
				parent: targetNode.id
				overwrite: overwrite
			}, ((res) ->
				fileContent = res.content
				fileName = res.fileName
				fileId = res.fileId
				folderId = res.parentId
				fileType = res.fileType
				if overwrite
					deleteNode matchId
				newNode = createNode fileId, folderId, fileName, fileType
				createFSMTab newNode, fileContent, fsmType
				loadingOff()

			), (error) ->
				loadingOff()
				displayError error
	newCPP = (isContext = no) ->
		targetNode = getParentTargetNode isContext
		return if not targetNode.type in ['folder', 'root']
		fileDialog 'New C++ Source File (CPP)', 'File Name: ', '', targetNode, '.cpp', (confirmed, fileName, overwrite, matchId) ->
			return unless confirmed

			loadingOn('Creating CPP file..')

			fileName = adjustFileSuffix fileName, '.cpp'
			fileName = "#{fileName}.cpp"

			request Urls.ajax, 'POST', {
				action: 'create'
				type: 'cpp'
				name: fileName
				parent: targetNode.id
				overwrite: overwrite
			}, ((res) ->
				fileContent = res.content
				fileName = res.fileName
				fileId = res.fileId
				folderId = res.parentId
				fileType = res.fileType
				if overwrite
					deleteNode matchId
				newNode = createNode fileId, folderId, fileName, fileType
				createAceTab newNode, fileContent
				loadingOff()

			), (error) ->
				loadingOff()
				displayError error
	newHPP = (isContext = no) ->
		targetNode = getParentTargetNode isContext
		return if not targetNode.type in ['folder', 'root']
		fileDialog 'New C++ Header File (HPP)', 'File Name: ', '', targetNode, '.hpp', (confirmed, fileName, overwrite, matchId) ->
			return unless confirmed

			loadingOn('Creating HPP file..')

			fileName = adjustFileSuffix fileName, '.hpp'
			fileName = "#{fileName}.hpp"

			request Urls.ajax, 'POST', {
				action: 'create'
				type: 'hpp'
				name: fileName
				parent: targetNode.id
				overwrite: overwrite
			}, ((res) ->
				fileContent = res.content
				fileName = res.fileName
				fileId = res.fileId
				folderId = res.parentId
				fileType = res.fileType
				if overwrite
					deleteNode matchId
				newNode = createNode fileId, folderId, fileName, fileType
				createAceTab newNode, fileContent
				loadingOff()

			), (error) ->
				loadingOff()
	newSOC = (isContext = no) ->
		targetNode = getParentTargetNode isContext
		return if not targetNode.type in ['folder', 'root']
		socDialog 'New System-on-Chip (SoC)', 'SoC Name: ', '', targetNode, '.soc', (confirmed, fileName, overwrite, matchId) ->
			return unless confirmed
			fileName = adjustFileSuffix fileName, '.soc'
			fileName = "#{fileName}.soc"

			request Urls.ajax, 'POST', {
				action: 'create'
				type: 'soc'
				name: fileName
				parent: targetNode.id
				overwrite: overwrite
			}, ((res) ->
				fileContent = res.content
				fileName = res.fileName
				fileId = res.fileId
				folderId = res.parentId
				fileType = res.fileType
				if overwrite
					deleteNode matchId
				newNode = createNode fileId, folderId, fileName, fileType
				createSOCTab newNode, fileContent
				loadingOff()

			), (error) ->
				loadingOff()
				displayError error
	newSYS = (isContext = no) ->
		targetNode = getParentTargetNode isContext
		return if not targetNode.type in ['folder', 'root']
		socDialog 'New System Model', 'System Name: ', '', targetNode, '.sys', (confirmed, fileName, overwrite, matchId) ->
			return unless confirmed
			fileName = adjustFileSuffix fileName, '.sys'
			fileName = "#{fileName}.sys"

			request Urls.ajax, 'POST', {
				action: 'create'
				type: 'sys'
				name: fileName
				parent: targetNode.id
				overwrite: overwrite
			}, ((res) ->
				fileContent = res.content
				fileName = res.fileName
				fileId = res.fileId
				folderId = res.parentId
				fileType = res.fileType
				if overwrite
					deleteNode matchId
				newNode = createNode fileId, folderId, fileName, fileType
				createSYSTab newNode, fileContent
				loadingOff()

			), (error) ->
				loadingOff()
				displayError error

	newText = (isContext = no) ->
		targetNode = getParentTargetNode isContext
		return if not targetNode.type in ['folder', 'root']
		fileDialog 'New Plain Text Document', 'File Name: ', 'Untitled Text Document.txt', targetNode, '.txt', (confirmed, fileName, overwrite, matchId) ->
			return unless confirmed

			loadingOn('Creating text file..')

			fileName = adjustFileSuffix fileName, '.txt'
			fileName = "#{fileName}.txt"

			request Urls.ajax, 'POST', {
				action: 'create'
				type: 'text'
				name: fileName
				parent: targetNode.id
				overwrite: overwrite
			}, ((res) ->
				fileContent = res.content
				fileName = res.fileName
				fileId = res.fileId
				folderId = res.parentId
				fileType = res.fileType
				if overwrite
					deleteNode matchId
				newNode = createNode fileId, folderId, fileName, fileType
				createAceTab newNode, fileContent
				loadingOff()

			), (error) ->
				loadingOff()
				displayError error

	newFolder = (isContext = no) ->
		targetNode = getParentTargetNode isContext
		return if not targetNode.type in ['folder', 'root']
		fileDialog 'New Folder', 'Folder Name: ', 'Untitled Folder', targetNode, '', (confirmed, fileName, overwrite, matchId) ->
			return unless confirmed
			loadingOn('Creating new folder..')

			request Urls.ajax, 'POST', {
				action: 'create'
				type: 'folder'
				name: fileName
				parent: targetNode.id
				overwrite: overwrite
			}, ((res) ->
				fileContent = res.content
				fileName = res.fileName
				fileId = res.fileId
				folderId = res.parentId
				fileType = res.fileType
				if overwrite
					deleteNode matchId
				newNode = createNode fileId, folderId, fileName, fileType

				selectNode newNode.id

				loadingOff()

			), (error) ->
				loadingOff()
				displayError error

	saveFile = (fileId, newContent, cb) ->
		loadingOn('Saving file..')
		request Urls.ajax, 'POST', {
			action: 'save'
			item: fileId
			content: newContent
		}, ((res) ->
			fileId = res.fileId
			fileName = res.fileName
			fileType = res.fileType

			modules = []
			if fileType in ['verilog', 'exverilog']
				modules = extractModules newContent
				targetNode = getNodeById fileId
			if fileType is 'verilog'
				$('#files').jstree(yes).set_icon(targetNode, '/images/tree-icons/Verilog.png')
			loadingOff()
			if typeof cb is 'function'
				cb null, fileId, fileName, fileType, newContent, modules
		), (err) ->
			loadingOff()
			cb err

	saveOpenTab = (isContext = no) ->
		editor = getActiveEditor()
		if editor
			editorTab = editor.tab
			return if editorTab.data 'saved'
			newContent = editor.getValue()
			fileId = editorTab.data 'fileId'
			tabId = "tabs-#{fileId}"
			saveFile fileId, newContent, (err, fileId, fileName, fileType, newContent, modules) ->
				if err
					return displayError err
				else
					if fileType in ['verilog', 'exverilog']
						deleteChildren fileId
						for module in modules
							moduleId = "#{module}_#{fileName}_#{module}_#{(new Date).valueOf()}_#{('' + Math.random()).split('.')[1]}"
							if fileId is topModuleEntry and module is topModule
								createNode moduleId, fileId, module, 'topmodule'
								topModuleId = moduleId
							else
								createNode moduleId, fileId, module, 'module'
					editorTab.data 'saved', yes
					setTabTitle tabId, fileName
		else
			fsm = getActiveFSM()
			if fsm
				fsmTab = fsm.tab
				return if fsmTab.data 'saved'
				newContent = JSON.stringify(fsm.ExportAsJSON())
				fileId = fsmTab.data 'fileId'
				tabId = "tabs-#{fileId}"
				saveFile fileId, newContent, (err, fileId, fileName, fileType, newContent, modules) ->
					if err
						return displayError err
					else
						fsmTab.data 'saved', yes
						setTabTitle tabId, fileName
			else
				waveform = getActiveWaveform()
				if waveform
					waveformTab = waveform.tab
					return if waveformTab.data 'saved'
					newContent = waveform.exportTimingDiagram()
					fileId = waveformTab.data 'fileId'
					tabId = "tabs-#{fileId}"
					saveFile fileId, newContent, (err, fileId, fileName, fileType, newContent, modules) ->
						if err
							return displayError err
						else
							waveformTab.data 'saved', yes
							setTabTitle tabId, fileName
				else
					soc = getActiveSOC()
					if soc
						socTab = soc.tab
						return if socTab.data 'saved'
						newContent = soc.exportJSON()
						fileId = socTab.data 'fileId'
						tabId = "tabs-#{fileId}"
						saveFile fileId, JSON.stringify(newContent), (err, fileId, fileName, fileType, newContent, modules) ->
							if err
								return displayError err
							else
								socTab.data 'saved', yes
								setTabTitle tabId, fileName
					else
						sys = getActiveSYS()
						if sys
							sysTab = sys.tab
							return if sysTab.data 'saved'
							newContent = sys.exportJSON()
							fileId = sysTab.data 'fileId'
							tabId = "tabs-#{fileId}"
							saveFile fileId, newContent, (err, fileId, fileName, fileType, newContent, modules) ->
								if err
									return displayError err
								else
									sysTab.data 'saved', yes
									setTabTitle tabId, fileName

	searchCleared = yes
	searchFile = (isContext = no) ->
		searchDialog 'File Search', 'File Name: ', '', (confirmed, query)->
			return unless confirmed
			$('#files').jstree(yes).search query
			searchCleared = no

	exitWorkspace = (isContext = no) ->
		saveAll yes, (err, cancelled) ->
			return if cancelled
			if err
				displayError err
			else
				window.location = "#{window.location.protocol}//#{window.location.host}/dashboard/"

	undoAction = (isContext = no) ->
		editor = getActiveEditor()
		editor.undo() if editor? and editor

	redoAction = (isContext = no) ->
		editor = getActiveEditor()
		editor.redo() if editor? and editor

	selectAll = (isContext = no) ->
		editor = getActiveEditor()
		editor.selectAll() if editor? and editor

	findAction = (isContext = no) ->
		editor = getActiveEditor()
		editor.execCommand('find') if editor? and editor

	replaceAction = (isContext = no) ->
		editor = getActiveEditor()
		editor.execCommand('replace') if editor? and editor

	refreshTree = (isContext = no) ->
		loadingOn('Refreshing..')
		getProjectTree (err, files, buildDir, retTopModule, retTopModuleEntry) ->
			loadingOff()
			if err
				displayError err.error
			else
				setTreeData files
				buildFolderId = buildDir
				topModule = retTopModule
				topModuleEntry = retTopModuleEntry

	copyFile = (isContext = no) ->
		targetNode = getTargetNode isContext
		return if not targetNode or not targetNode.type in writeableFiles
		$('#files').jstree(yes).copy targetNode

	cutFile = (isContext = no) ->
		targetNode = getTargetNode isContext
		return if not targetNode or not targetNode.type in writeableFiles
		$('#files').jstree(yes).cut targetNode

	pasteId = null
	pasteFile = (isContext = no) ->
		targetNode = getTargetNode isContext
		unless $('#files').jstree(yes).can_paste()
			return disableMenuItem 'paste'
		return unless targetNode.type in ['folder', 'root']
		buffer = $('#files').jstree(yes).get_buffer()
		source = buffer.node[0]

		overwrite = no
		matchId = no
		_operate = (action)->
			request Urls.ajax, 'POST', {
				'action': action
				'item': source.id
				'target': targetNode.id
				'overwrite': overwrite
			}, ((res) ->
				fileId = res.fileId
				fileName = res.fileName
				parentId = res.parentId
				fileType = res.fileType
				itemType = 'file'
				if overwrite
					deleteNode matchId
				$('#files').jstree(yes).paste(targetNode)
				if pasteId isnt fileId
					setNodeId pasteId, fileId
				if not isNodeOpen targetNode
					openNode targetNode.id
				selectNode fileId

				loadingOff()
			), (error) ->
				displayError error
				loadingOff()

		if buffer.mode is 'copy_node'
			if matchId = hasChild(targetNode.id, buffer.node[0].text)
				dialogTitle = "Overwrite #{buffer.node[0].text}"
				dialogMessage = getWarnDialogHTML "\"#{buffer.node[0].text}\" already exists. Are you sure you want to overwrite it?"

				confirmationDialog dialogTitle, dialogMessage, (confirmed) ->
					if confirmed
						overwrite = yes
						loadingOn('Copying file..')
						_operate 'copy'


			else
				loadingOn('Copying file..')
				_operate 'copy'

		else if buffer.mode is 'move_node'
			if matchId = hasChild(targetNode.id, buffer.node[0].text)
				dialogTitle = "Overwrite #{buffer.node[0].text}"
				dialogMessage = getWarnDialogHTML "\"#{buffer.node[0].text}\" already exists. Are you sure you want to overwrite it?"

				confirmationDialog dialogTitle, dialogMessage, (confirmed) ->
					if confirmed
						overwrite = yes
						loadingOn('Moving file..')
						_operate 'move'

			else
				loadingOn('Moving file..')
				_operate 'move'

	includeInBuild = (isContext = no) ->
		targetNode = getTargetNode isContext
		return if not targetNode or (targetNode.type isnt 'exverilog' and targetNode.type isnt 'exip')
		targetId = targetNode.id
		loadingOn('Adding file to include list..')
		request Urls.ajax, 'POST', {
			action: 'include'
			item: targetId
		}, ((res) ->
			fileId = res.fileId
			fileName = res.fileName
			fileType = res.fileType
			if targetNode.type in ['ip', 'exip']
				$('#files').jstree(yes).set_type(targetNode, 'ip')
				refreshTabIcon targetNode
			else
				$('#files').jstree(yes).set_type(targetNode, 'verilog')
				refreshTabIcon targetNode

			loadingOff()
		), (error) ->
			loadingOff()
			displayError error


	excludeFromBuild = (isContext = no) ->
		targetNode = getTargetNode isContext
		return if not targetNode or (targetNode.type isnt 'verilog' and targetNode.type isnt 'ip')
		targetId = targetNode.id
		loadingOn('Adding file to exclude list..')
		request Urls.ajax, 'POST', {
			action: 'exclude'
			item: targetId
		}, ((res) ->
			fileId = res.fileId
			fileName = res.fileName
			fileType = res.fileType
			if targetNode.type in ['ip', 'exip']
				$('#files').jstree(yes).set_type(targetNode, 'exip')
				refreshTabIcon targetNode
			else
				$('#files').jstree(yes).set_type(targetNode, 'exverilog')
				refreshTabIcon targetNode
			loadingOff()
		), (error) ->
			loadingOff()
			displayError error

	convertIntoVerilog = (isContext = no) ->
		targetNode = getTargetNode isContext
		return if not targetNode or (targetNode.type isnt 'testbench')
		targetId = targetNode.id
		sourceType = targetNode.type
		loadingOn('Changing file type..')
		request Urls.ajax, 'POST', {
			action: 'tbtoverilog'
			item: targetId
		}, ((res) ->
			fileId = res.fileId
			fileName = res.fileName
			fileType = res.fileType
			$('#files').jstree(yes).set_type(targetNode, fileType)
			refreshTabIcon targetNode
			loadingOff()
		), (error) ->
			loadingOff()
			displayError error

	convertIntoTestbench = (isContext = no) ->
		targetNode = getTargetNode isContext
		return if not targetNode or (targetNode.type isnt 'verilog' and targetNode.type isnt 'exverilog')
		targetId = targetNode.id
		sourceType = targetNode.type
		loadingOn('Changing file type..')
		request Urls.ajax, 'POST', {
			action: 'verilogtotb'
			item: targetId
		}, ((res) ->
			fileId = res.fileId
			fileName = res.fileName
			fileType = res.fileType
			$('#files').jstree(yes).set_type(targetNode, fileType)
			refreshTabIcon targetNode
			loadingOff()
		), (error) ->
			loadingOff()
			displayError error

	renameFile = (isContext = no) ->
		targetNode = getTargetNode isContext

		if targetNode.type is 'root'
			return displayError 'Cannot rename repository root.'
		if targetNode.type is 'buildFolder'
			return displayError 'Cannot rename read-only directory.'

		fileId = targetNode.id
		oldName = targetNode.text

		_rollback = (updatedNode)->
			renameNode updatedNode, oldName

		extension = getFileExtension targetNode


		$('#files').jstree(yes).edit targetNode, null, (updatedNode, success, cancelled) ->
			return if cancelled
			if not success
				return displayError 'A file with the same name already exists.'
			else
				rawName = newName = updatedNode.text
				newName = updatedNode.text
				newName = adjustFileSuffix newName, extension
				newName = "#{newName}#{extension}"
				if (rawName isnt newName) and (matchId = hasChild(targetNode.parent, newName))
					displayError 'A file with the same name already exists.'
					_rollback updatedNode
					return

				newName.substr newName.lastIndexOf('.')
				loadingOn('Renaming file..')
				request Urls.ajax, 'POST', {
					action: 'rename'
					item: fileId
					newname: newName
					overwrite: no
				}, ((res) ->
					fileId = res.fileId
					fileName = res.fileName
					tabId = "tabs-#{fileId}"
					tab = $("##{tabId}")
					if tab.length
						saved = tab.data 'saved'
						tabTitle = fileName
						if saved? and not saved
							tabTitle = tabTitle + ' *'
						setTabTitle tabId, tabTitle
					renameNode updatedNode, fileName
					loadingOff()
				), (error) ->
					_rollback updatedNode
					loadingOff()
					displayError error

	deleteFile = (isContext = no) ->
		targetNode = getTargetNode isContext
		if targetNode.type is 'root'
			return displayError 'Cannot delete repository root.'
		if targetNode.type is 'buildFolder'
			return displayError 'Cannot delete read-only directory.'

		dialogTitle = "Delete #{targetNode.text}"
		dialogMessage = getWarnDialogHTML "Are you sure you want to delete \"#{targetNode.text}\"?"
		r1 = Math.random()
		r2 = Math.random()
		confirmationDialog dialogTitle, dialogMessage, ((target) ->
			return (confirmed) ->
				if confirmed
					if target
						targetId = target.id
						loadingOn('Deleting file..')
						request Urls.ajax, 'POST', {
							'action': 'delete'
							'item': targetId
						}, ((res) ->
							fileId = res.fileId
							fileName = res.fileName
							loadingOff()
							displayMessage "#{fileName} was deleted successfully."
							deleteNode fileId
						), (error) ->
							loadingOff()
							displayError error
			)(targetNode)

	duplicateFile = (isContext = no) ->
		targetNode = getTargetNode isContext
		return if targetNode.type in ['folder', 'buildFolder', 'root', 'module', 'topmodule']

		targetId = targetNode.id

		dialogTitle = "Duplicate #{targetNode.text}"
		dialogMessage = "<p>Are you sure you want to duplicate \"#{targetNode.text}\"?</p>"

		confirmationDialog dialogTitle, dialogMessage, (confirmed) ->
			if confirmed
				fileName = targetNode.text
				duplicateName = undefined
				extRegEx = /(.+)\.([0-9a-z]+)$/i
				if targetNode.type in ['verilog', 'exverilog', 'testbench', 'text'] and extRegEx.test(fileName)
					matches = extRegEx.exec(fileName)
					baseName = matches[1]
					extension = matches[2]
					duplicateNameRegex = /(.+)_\d+ *$/
					if duplicateNameRegex.test baseName
						baseName = duplicateNameRegex.exec(baseName)[1]

					unless matchId = hasChild(targetNode.parent, baseName + '.' + extension)
						duplicateName = baseName + '.' + extension
					else
						duplicateName = baseName + '_2' + '.' + extension
						instanceNumber = 3
						while hasChild targetNode.parent, duplicateName
							duplicateName = baseName + '_' + instanceNumber + '.' + extension
							instanceNumber++
				else if targetNode.type is 'folder'
					duplicateNameRegex = /(.+)_\d+ *$/
					if duplicateNameRegex.test fileName
						fileName = duplicateNameRegex.exec(fileName)[1]
					unless hasChild targetNode.parent, fileName
						duplicateName = fileName
					else
						duplicateName = fileName + '_2'
						instanceNumber = 3
						while hasChild targetNode.parent, duplicateName
							duplicateName = fileName + '_' + instanceNumber
							instanceNumber++
				else
					return displayError error: 'Cannot duplicate the selected file type.'

				request Urls.ajax, 'POST', {
					action: 'duplicate'
					item: targetId
					newname: duplicateName
				}, ((res) ->
					fileId = res.fileId
					fileName = res.fileName
					parentId = res.parentId
					fileType = res.fileType

					createNode fileId, parentId, fileName, fileType, getNodeIndex(targetId) + 1
					selectNode fileId
				), (error) ->
					displayError error

	downloadFile = (isContext = no) ->
		targetNode = getTargetNode isContext
		return unless targetNode.type in ['verilog', 'exverilog', 'testbench', 'text', 'netlist', 'sta', 'srpt', 'bin']

		targetId = targetNode.id

		downloadWindow = window.open Urls.download + targetId
		if not downloadWindow or not downloadWindow.closed? or downloadWindow.closed
			displayError error: 'You need to enable pop-ups to download files.'

	buildFile = (isContext = no) ->
		targetNode = getTargetNode isContext
		if targetNode.type isnt 'verilog'
			return displayError error: 'Please select Verilog source file'
		saveAll no, (err, cancelled) ->
			return if cancelled
			if err
				displayError err
			else
				loadingOn('Validating file..')
				targetId = targetNode.id
				request Urls.ajax, 'POST',
					action: 'validate'
					item: targetId,
					((res) ->
						clearAllGrids()

						errors = res.errors
						warnings = res.warnings


						if warnings.length > 0
							warnings.forEach (warn) ->
								logWarning warn
						setLogTab 2

						if errors.length is 0
							if warnings.length is 0
								displayMessage 'Module passed verification successfully.'
							else
								displayMessage 'Module passed verification with warnings.'
							$('#files').jstree(yes).set_icon(targetNode, '/images/tree-icons/VerilogV.png')
						else
							errors.forEach (err) ->
								logError err
							$('#files').jstree(yes).set_icon(targetNode, '/images/tree-icons/Verilog.png')
							setLogTab 1

						loadingOff()
						), (err) ->
							displayError err
							$('#files').jstree(yes).set_icon(targetNode, '/images/tree-icons/Verilog.png')
							loadingOff()

	buildProject = (isContext = no) ->
		saveAll no, (err, cancelled) ->
			return if cancelled
			if err
				displayError err
			else
				loadingOn('Validating project files..')
				request Urls.compile, 'POST',
					action: 'validate',
					((res) ->
						clearAllGrids()

						errors = res.errors
						warnings = res.warnings


						if warnings.length > 0
							warnings.forEach (warn) ->
								logWarning warn
						setLogTab 2

						if errors.length is 0
							if warnings.length is 0
								displayMessage 'Module passed verification successfully.'
							else
								displayMessage 'Module passed verification with warnings.'
						else
							errors.forEach (err) ->
								logError err
							setLogTab 1

						loadingOff()
						), (err) ->
							displayError err
							loadingOff()

	synthesize = (isContext = no) ->
		saveAll no, (err, cancelled) ->
			return if cancelled
			if err
				displayError err
			else
				getStandardCells (err, stdcells) ->
					if err
						displayError err
					else
						defaultName = 'synthesis.v'
						if topModule isnt '' and topModuleEntry?
							defaultName = "#{topModule}.netlist.v"
						synthesisDialog stdcells, defaultName, (confirmed, fileName, stdcell, options, overwrite, matchId) ->
							return unless confirmed
							fileName = adjustFileSuffix fileName, '.v'
							fileName = "#{fileName}.v"

							loadingOn('Synthesizing..')

							request Urls.compile, 'POST',
								action: 'synthesize'
								stdcell: stdcell
								overwrite: overwrite
								options: options
								name: fileName,
								((res) ->
									clearAllGrids()
									fileId = res.fileId
									fileName = res.fileName
									fileType = res.fileType
									parentId = res.parentId
									synthContent = res.content
									errors = res.log.errors
									warnings = res.log.warnings
									report = res.log.report
									reportErrors = res.reportErrors
									synthesisReport = res.synthesisReport

									if typeof report is 'string'
										report.split('\n').forEach (reportLine)->
											if reportLine.trim() isnt ''
												logInfo message: reportLine
										setLogTab 0

									if reportErrors? and typeof reportErrors is 'object'
										if typeof reportErrors.error is 'string'
											reportErrors.error.split('\n').forEach (reportLine)->
												logError message: reportLine
											setLogTab 1

									if warnings.length > 0
										warnings.forEach (warn) ->
											logWarning warn
										setLogTab 2

									loadingOff()

									if errors.length is 0
										deleteNode fileId
										if warnings.length is 0
											displayInfo 'Synthesis completed successfully.'
										else
											displayInfo 'Synthesis completed with warnings.'

										if overwrite
											deleteNode matchId
										if synthesisReport
											reportNode = createNode synthesisReport._id, synthesisReport.parent, synthesisReport.title, 'srpt'
										newNode = createNode fileId, parentId, fileName, fileType
										createAceTab newNode, synthContent
										selectNode fileId
									else
										errors.forEach (err) ->
											logError err
										setLogTab 1
							), (err) ->
									loadingOff()
									displayError err
	compileSW = (isContext = no) ->
		saveAll no, (err, cancelled) ->
			return if cancelled
			if err
				displayError err
			else
				defaultName = 'sw.obj'
				if topModule isnt '' and topModuleEntry?
					defaultName = "#{topModule}.obj"
				compilerDialog files, defaultName, (confirmed, fileName, overwrite, matchId) ->
					return unless confirmed
					fileName = adjustFileSuffix fileName, '.obj'
					fileName = "#{fileName}.obj"

					loadingOn('Compiling C++ Files..')

					request Urls.compile, 'POST',
						action: 'cpp'
						overwrite: overwrite
						name: fileName,
						((res) ->
							clearAllGrids()
							fileId = res.fileId
							fileName = res.fileName
							fileType = res.fileType
							parentId = res.parentId
							errors = res.log.errors
							warnings = res.log.warnings

							if warnings.length > 0
								warnings.forEach (warn) ->
									logWarning message: warn
								setLogTab 2

							loadingOff()

							if errors.length is 0
								deleteNode fileId
								if warnings.length is 0
									displayInfo 'Compilation completed successfully.'
								else
									displayInfo 'Compilation completed with warnings.'

								if overwrite
									deleteNode matchId
								newNode = createNode fileId, parentId, fileName, fileType
								selectNode fileId
							else
								errors.forEach (err) ->
									logError message: err
								setLogTab 1
					), (err) ->
							loadingOff()
							displayError err
	generateBitstream = (isContext = no) ->
		saveAll no, (err, cancelled) ->
			return if cancelled
			if err
				displayError err
			else
				getPCFFiles (err, files) ->
					if err
						displayError err
					else unless files.length
						displayError error: "The project does not contain pin constraints file(s)."
					else
						defaultName = 'synthesis.bin'
						if topModule isnt '' and topModuleEntry?
							defaultName = "#{topModule}.bin"
						bitstreamDialog files, defaultName, (confirmed, fileName, pcfId, overwrite, matchId) ->
							return unless confirmed
							fileName = adjustFileSuffix fileName, '.bin'
							fileName = "#{fileName}.bin"

							loadingOn('Generating bitstream..')

							request Urls.compile, 'POST',
								action: 'bitstream'
								pcf: pcfId
								overwrite: overwrite
								name: fileName,
								((res) ->
									clearAllGrids()
									fileId = res.fileId
									fileName = res.fileName
									fileType = res.fileType
									parentId = res.parentId
									errors = res.log.errors
									warnings = res.log.warnings

									if warnings.length > 0
										warnings.forEach (warn) ->
											logWarning message: warn
										setLogTab 2

									loadingOff()

									if errors.length is 0
										deleteNode fileId
										if warnings.length is 0
											displayInfo 'Synthesis completed successfully.'
										else
											displayInfo 'Synthesis completed with warnings.'

										if overwrite
											deleteNode matchId
										newNode = createNode fileId, parentId, fileName, fileType
										selectNode fileId
									else
										errors.forEach (err) ->
											logError message: err
										setLogTab 1
							), (err) ->
									loadingOff()
									displayError err


	simulate = (isContext = no) ->
		targetNode = getTargetNode isContext
		if targetNode.type not in ['testbench', 'vcd', 'netlist']
			return displayError error: 'Please select a valid testbench, VCD, or netlist for simulation.'
		saveAll no, (err, cancelled) ->
			return if cancelled
			if err
				displayError err
			else
				defaultName = "#{adjustFileSuffix(targetNode.text, '.v')}.vcd"
				targetId = targetNode.id
				if targetNode.type is 'vcd'
					defaultName = targetNode.text
				isNetlist = no
				netlistSrc = undefined
				stdCellsSrc = undefined
				fileDialogCallback = (confirmed, fileName, overwrite, matchId, simulationTime) ->
					return unless confirmed
					fileName = adjustFileSuffix fileName, '.vcd'
					fileName = "#{fileName}.vcd"
					requestBody =
						name: fileName
						action: 'simulate'
						overwrite: overwrite
						item: targetId
						time: simulationTime
					if isNetlist
						requestBody.netlist =  yes
						requestBody.netlistId = netlistSrc
						requestBody.stdcell = stdCellsSrc
					loadingOn('Simulating..')
					request Urls.ajax, 'POST', requestBody, ((res) ->
							clearAllGrids()
							log = (res.log or []).filter((msg) -> typeof msg is 'string' and msg.trim() isnt '')
							errors = (res.errors or []).filter((msg) -> typeof msg is 'object' and msg.message.trim() isnt '')
							warnings = (res.warnings or []).filter((msg) -> typeof msg is 'object' and msg.message.trim() isnt '')
							fileId = res.fileId
							fileName = res.fileName
							fileType = res.fileType
							parentId = res.parentId

							if log.length > 0
								log.forEach (logMessage) ->
									logInfo message: logMessage
								setLogTab 0


							if warnings.length > 0
								warnings.forEach (warn) ->
									logWarning warn
								setLogTab 2

							if errors.length is 0
								if not fileId?
									loadingOff()
									return displayError 'Fatal error has occured during simulation.'
								deleteNode fileId
								if warnings.length is 0
									displayMessage 'Simulation completed successfully.'
								else
									displayMessage 'Simulation completed with warnings.'
								createNode fileId, parentId, fileName, fileType
								openFileById fileId
							else
								errors.forEach (err) ->
										logError err
								setLogTab 1
							loadingOff()
						), (err) ->
								displayError err
								loadingOff()

				if targetNode.type is 'netlist'
					loadingOn('Retrieving verilog files..')
					getTestbenchFiles (err, testbenches) ->
						loadingOff()
						if err
							displayError err
						else
							loadingOn('Retrieving standard cell files..')
							getStandardCells (err, stdcells) ->
								loadingOff()
								if err
									displayError err
								else
									netlistSimulationDialog defaultName, testbenches, stdcells, getBuildFolderNode(), '.vcd', (confirmed, fileTitle, testbench, stdcell, overwrite, matchId) ->
										isNetlist = yes
										netlistSrc = targetId
										targetId = testbench
										stdCellsSrc = stdcell
										loadingOff()
										fileDialogCallback(confirmed, fileTitle, overwrite, matchId)

				else
					simulationDialog 'Simulation Options', 'VCD File Name: ', defaultName, getBuildFolderNode(), '.vcd', fileDialogCallback

	workspaceSettings = () ->
		getProjectSettings (err, settings) ->
			if err
				loadingOff()
				if typeof cb is 'function'
					cb err
				else
					return displayError err
			else
				workspaceSettingsDialog settings.theme, settings.fontSize, (confirmed, themeIndex, fontSize, defaultSettings) ->
					if confirmed
						request Urls.settings, 'POST',
							theme: themeIndex
							fontSize: fontSize
							defaultSettings: defaultSettings,
							((res) ->
								displayMessage 'Settings updated successfully.'
								tabs = getAllTabIds()
								notSavedTabs = []
								defaultThemeIndex = themeIndex
								defaultFontSize = fontSize
								tabs.forEach (tabId) ->
									editor = $("##{tabId}").data 'editor'
									if editor
										editor.setFontSize fontSize
										if themeIndex is 1
											editor.setTheme 'ace/theme/crimson_editor'
										else
											editor.setTheme 'ace/theme/iplastic'
								#TODO: UPDATE THE WORKSPACE
								#TODO: UPDATE ACTIVE TABS
							), (err) ->
									displayError err
									loadingOff()

	exportBlock = () ->
		loadingOn('Retrieving files..')
		getNetlistFiles (err, netlists) ->
			if err
				loadingOff()
				if typeof cb is 'function'
					cb err
				else
					return displayError err
			else
				getIconFiles (err, icons) ->
					if err
						loadingOff()
						if typeof cb is 'function'
							cb err
						else
							return displayError err
					else
						loadingOff()
						exportDialog 'Export', netlists, icons, (confirmed, netlistId, projectName) ->
							if confirmed
								loadingOn('Exporting..')
								request Urls.externalExport, 'POST', {
												uid: repoName
												item: netlistId
												project: projectName
											}, ((res) ->
												loadingOff()
												displayMessage 'The file has been exported successfully.'
											), (error) ->
												loadingOff()
												if typeof cb is 'function'
													cb error
												else
													displayError error

	about = (isContext = no) ->

		dialogTitle = "About CloudV"
		dialogMessage = """<p>
                    Cloud V (sometimes stylized as CloudV) is a cloud-based hardware development platform. It is built by a team of researchers encompassing professors, graduate and undergraduate students from <a href="https://aucegypt.edu">The American University in Cairo</a> and <a href="https://brown.edu">Brown University</a>.
					For more info, <a href="/about" target="_blank">click here.</a>
                </p>"""
		width = 350
		height = 180
		dialogBox dialogTitle, dialogMessage, width, height
		return
		url = "#{window.location.protocol}//#{window.location.host}#{Urls.aboutCloudV}"
		aboutWindow = window.open url
		if not aboutWindow or not aboutWindow.closed? or aboutWindow.closed
			displayError error: 'You need to enable pop-ups to download files.'
		return
		dialogTitle = "About CloudV"
		dialogMessage = "<p>CloudV is an online digital design, project management, and collaboration environment. For inquiries, please contact agiza@cloudv.io </p>"
		width = 350
		height = 180
		dialogBox dialogTitle, dialogMessage, width, height

	help = (isContext = no) ->
		return
		helpWindow = window.open Urls.cloudvHelp
		if not helpWindow or not helpWindow.closed? or helpWindow.closed
			displayError error: 'You need to enable pop-ups to download files.'

	bugReport = (isContext = no) ->
		reportDialog (confirmed, bugTitle, bugBody) ->
			return unless confirmed
			loadingOn('Sending bug report..')
			request "#{Urls.bug}", 'POST', {
				title: bugTitle
				body: bugBody
			}, ((res) ->
				loadingOff()
				displayMessage 'The bug has been reported successfully.'
		), (err) ->
				loadingOff()
				displayError err

	comingSoon = (dialogTitle)->
		dialogMessage = "<p>Coming soon.</p>"
		dialogBox dialogTitle, dialogMessage

	retrieveFile = (fileId, cb)->
		request "#{Urls.retrieve.file}#{fileId}", 'GET', {}, ((res) ->
			fileContent = res.content
			fileName = res.name
			fileType = res.type
			modules = []
			if fileType in ['verilog', 'exverilog']
				modules = extractModules fileContent
			else if fileType is 'vcd'
				if typeof res.timing is 'string' and res.timing.trim() isnt ''
					try
						modules = JSON.parse res.timing
					catch e
						console.error e
						modules = undefined
				else
					modules = undefined
			cb null, fileContent, fileName, fileType, modules
		), (err) ->
			cb err

	openFileById = (fileNode, cb) ->
		if typeof fileNode is 'string'
			fileNode = getNodeById fileNode
		fileId = fileNode.id
		tabId = "tabs-#{fileId}"
		if getTabById tabId
			setActiveEditorTabById tabId
			if typeof cb is 'function'
				cb null
		else
			if fileNode.type is 'bin'
				dialogTitle = "Download #{fileNode.text}"
				dialogMessage = "<p>Do you want to download #{fileNode.text}?</p>"
				confirmationDialog dialogTitle, dialogMessage, (accepted) ->
					if accepted
						downloadWindow = window.open Urls.download + fileNode.id
						if not downloadWindow or not downloadWindow.closed? or downloadWindow.closed
							displayError error: 'You need to enable pop-ups to download files.'
			else
				loadingOn('Retrieving file..')
				retrieveFile fileNode.id, (err, fileContent, fileName, fileType, modules) ->
					if err
						loadingOff()
						if typeof cb is 'function'
							cb err
						else
							return displayError err
					else
						if fileType in ['verilog', 'exverilog']
							deleteChildren fileId
							for module in modules
								moduleId = "#{module}_#{fileName}_#{module}_#{(new Date).valueOf()}_#{('' + Math.random()).split('.')[1]}"
								if fileNode.id is topModuleEntry and module is topModule
									createNode moduleId, fileId, module, 'topmodule'
									topModuleId = moduleId
								else
									createNode moduleId, fileId, module, 'module'
						if fileType in ['verilog', 'testbench', 'netlist', 'text', 'srpt', 'exverilog', 'cpp', 'hpp']
							createAceTab fileNode, fileContent
						else if fileType in ['ip', 'exip']
							createAceTab fileNode, JSON.stringify(JSON.parse(fileContent), null, 2)
						else if fileType is 'vcd'
							createWaveformTab fileNode, fileContent, modules
						else if fileType is 'fsm'
							createFSMTab fileNode, fileContent
						else if fileType is 'sta'
							createSTATab fileNode, fileContent
						else if fileType is 'pcf'
							createPCFEditor fileNode, fileContent
						else if fileType is 'sys'
							createSYSTab fileNode, fileContent
						else if fileType is 'soc'
							createSOCTab fileNode, fileContent
						loadingOff()
						selectNode fileNode.id
						if typeof cb is 'function'
							cb null
		openNode fileId

	openFile = (isContext = no, cb) ->
		targetNode = getTargetNode isContext
		if targetNode.type in ['module', 'topmodule']
			targetNode = getNodeById targetNode.parent
		return unless (targetNode? and targetNode)
		return unless targetNode.type in ['verilog', 'testbench', 'netlist', 'text', 'vcd', 'fsm', 'sta', 'srpt', 'exverilog', 'ip', 'exip', 'pcf', 'bin', 'soc', 'sys']
		openFileById targetNode, cb

	closeFile = (isContext = no) ->
		targetNode = getTargetNode isContext

		tabId = "tabs-#{targetNode.id}"
		tab = $("##{tabId}")

		if tab.length
			editor = tab.data 'editor'
			if editor
				fileId = tab.data 'fileId'
				closeTab tabId

	removeCurrentTopModule = ->
		$('#files').jstree(yes).set_type(topModuleId, 'module')

	setTopModule = (isContext = no, cb) ->
		targetNode = getTargetNode isContext

		return unless targetNode.type in ['module', 'topmodule']

		parentId = targetNode.parent
		moduleName = targetNode.text

		loadingOn('Setting top module..')
		request Urls.ajax, 'POST', {
						action: 'settop'
						item: parentId
						module: moduleName
					}, ((res) ->
						loadingOff()
						fileId = res.fileId
						setModule = res.module
						$('#files').jstree(yes).set_type(targetNode, 'topmodule')
						removeCurrentTopModule()
						topModuleId = targetNode.id
						topModuleEntry = fileId
						topModule = setModule
						if typeof cb is 'function'
							cb null
						else
							displayMessage("#{setModule} was set as top project module.")
					), (error) ->
						loadingOff()
						if typeof cb is 'function'
							cb error
						else
							displayError error

	$('#toolbar-export').button(
			icons:
				primary: 'ui-icon-extlink'
		).click (e) ->
			exportBlock()

	$('#toolbar-exit').button(
			text: no
			icons:
				primary: 'fa fa-times'
		).click (e) ->
			exitWorkspace()
	toolbar = $('.toolbar')
	menubar = $('.menubar')
	exitButton = $('#toolbar-exit')

	staAnalysis = (isContext = no) ->
		targetNode = getTargetNode isContext
		return unless targetNode.type is 'netlist'
		getStandardCells (err, stdcells) ->
			if err
				displayError err
			else
				staDialog stdcells, (confirmed, fileName, stdcell, options, overwrite, matchId) ->
					return unless confirmed
					fileName = adjustFileSuffix fileName, '.sta'
					fileName = "#{fileName}.sta"

					loadingOn('Running Static Timing Analysis..')

					request Urls.ajax, 'POST',
						action: 'sta'
						stdcell: stdcell
						overwrite: overwrite
						options: options
						item: targetNode.id
						name: fileName,
						((res) ->
							clearAllGrids()
							fileId = res.fileId
							fileName = res.fileName
							fileType = res.fileType
							parentId = res.parentId
							sta = res.content

							loadingOff()

							deleteNode fileId
							displayInfo 'Analysis completed successfully.'

							if overwrite
								deleteNode matchId

							newNode = createNode fileId, parentId, fileName, fileType
							createSTATab newNode, sta
							selectNode fileId

					), (err) ->
							loadingOff()
							displayError err

	synthesisReport = (isContext = no) ->
		targetNode = getTargetNode isContext
		return unless targetNode.type is 'netlist'

	refreshMenus = (e)->
		enableMenuItem 'new'
		enableMenuItem 'verilog-module'
		enableMenuItem 'verilog-testbench'
		enableMenuItem 'finite-state-machine'
		enableMenuItem 'plain-text-document'
		enableMenuItem 'ip-core'
		enableMenuItem 'pin-constraints-file'
		enableMenuItem 'new-folder'
		enableMenuItem 'save'
		enableMenuItem 'search'
		enableMenuItem 'exit-workspace'
		enableMenuItem 'undo'
		enableMenuItem 'redo'
		enableMenuItem 'select-all'
		enableMenuItem 'find'
		enableMenuItem 'find-and-replace'
		enableMenuItem 'refresh'
		enableMenuItem 'copy'
		enableMenuItem 'cut'
		enableMenuItem 'paste'
		enableMenuItem 'rename'
		enableMenuItem 'delete'
		enableMenuItem 'duplicate'
		enableMenuItem 'download-file'
		enableMenuItem 'validate-project'
		enableMenuItem 'synthesize'
		enableMenuItem 'simulate'
		enableMenuItem 'static-timing-analysis'
		enableMenuItem 'synthesis-report'
		enableMenuItem 'about'
		enableMenuItem 'help'
		enableMenuItem 'report-a-bug'
		disableMenuItem 'synthesis-report'

		currentEditor = getActiveEditor()
		currentWaveform = getActiveWaveform()
		currentFSM = getActiveFSM()
		currentSOC = getActiveSOC()
		currentSYS = getActiveSYS()
		unless (currentEditor? and currentEditor) or (currentWaveform? and currentWaveform) or (currentFSM? and currentFSM) or (currentSOC? and currentSOC) or (currentSYS? and currentSYS)
			disableMenuItem 'save'
			disableMenuItem 'undo'
			disableMenuItem 'redo'
			disableMenuItem 'select-all'
			disableMenuItem 'find'
			disableMenuItem 'find-and-replace'
		else if currentEditor.$readOnly
			disableMenuItem 'save'
			disableMenuItem 'undo'
			disableMenuItem 'redo'
			disableMenuItem 'find-and-replace'

		selectedNode = getSelectedNode()
		if selectedNode and selectedNode.type is 'buildFolder'
			disableMenuItem 'new'
			disableMenuItem 'verilog-module'
			disableMenuItem 'verilog-testbench'
			disableMenuItem 'finite-state-machine'
			disableMenuItem 'plain-text-document'
			disableMenuItem 'ip-core'
			disableMenuItem 'new-folder'

		if not selectedNode
			disableMenuItem 'copy'
			disableMenuItem 'cut'
			disableMenuItem 'paste'
			disableMenuItem 'rename'
			disableMenuItem 'delete'
			disableMenuItem 'duplicate'
			disableMenuItem 'download-file'
			disableMenuItem 'simulate'
			disableMenuItem 'static-timing-analysis'
			disableMenuItem 'synthesis-report'
			return

		nodeType = selectedNode.type
		topNode = getTopFolderNode()
		parentNode = getNodeById(selectedNode.parent)



		if parentNode.type is 'buildFolder'
			disableMenuItem 'copy'
			disableMenuItem 'cut'
			disableMenuItem 'duplicate'

		if nodeType is 'buildFolder'
			disableMenuItem 'copy'
			disableMenuItem 'cut'
			disableMenuItem 'rename'
			disableMenuItem 'delete'

		if not $('#files').jstree(yes).can_paste() or nodeType is 'buildFolder'
			disableMenuItem 'paste'

		if nodeType isnt 'netlist'
			disableMenuItem 'static-timing-analysis'
			disableMenuItem 'synthesis-report'

		if nodeType isnt 'verilog' then #Disable exclude from build

		if nodeType isnt 'exverilog' then #Disable include in build

		if nodeType isnt 'ip' then #Disable exclude from build

		if nodeType isnt 'exip' then #Disable include in build

		if topNode.type is 'folder' or topNode.type is 'root' or topNode.type is 'buildFolder'
			#disableMenuItem 'settop'
			#disableMenuItem 'open'
			disableMenuItem 'duplicate'
			disableMenuItem 'download-file'
			# disableMenuItem 'close'
		else if nodeType in ['module', 'topmodule']
			disableMenuItem 'new'
			disableMenuItem 'verilog-module'
			disableMenuItem 'verilog-testbench'
			disableMenuItem 'finite-state-machine'
			disableMenuItem 'plain-text-document'
			disableMenuItem 'new-folder'
			# disableMenuItem 'open'
			disableMenuItem 'copy'
			disableMenuItem 'cut'
			disableMenuItem 'paste'
			disableMenuItem 'rename'
			disableMenuItem 'delete'
			disableMenuItem 'duplicate'
			disableMenuItem 'download-file'
			disableMenuItem 'ip-core'
			# disableMenuItem 'close'
		else
			disableMenuItem 'paste'
			#disableMenuItem 'settop'
			disableMenuItem 'new'
			disableMenuItem 'verilog-module'
			disableMenuItem 'verilog-testbench'
			disableMenuItem 'finite-state-machine'
			disableMenuItem 'plain-text-document'
			disableMenuItem 'ip-core'
			disableMenuItem 'pin-constraints-file'
			disableMenuItem 'new-folder'
		if (topNode.type is 'folder' or topNode.type is 'root') and $('#files').jstree(yes).can_paste()
			enableMenuItem 'paste'

	#$('#log-tabs').tabs active: 0

	$('#files').jstree(
		plugins:
			[
				'wholerow'
				'types'
				'unique'
				'search'
			]
		unique:
			case_sensitive: yes
		search:
			close_opened_onclear: no
			fuzzy: yes
		types:
				default:
					icon: '/images/tree-icons/Blank.png'
				'#':
					icon: '/images/tree-icons/Folder.png'
					valid_children: ['root']
				root:
					icon: '/images/tree-icons/Folder.png'
					valid_children: writeableFiles.slice()
				buildFolder:
					icon: '/images/tree-icons/Folder.png'
					valid_children: ['netlist', 'vcd', 'sta', 'srpt', 'bin', 'obj']
				folder:
					icon: '/images/tree-icons/Folder.png'
					valid_children: writeableFiles.slice()
				verilog:
					icon: '/images/tree-icons/Verilog.png'
					valid_children: ['module', 'topmodule']
				exverilog:
					icon: '/images/tree-icons/excluded-verilog.png'
					valid_children: ['module', 'topmodule']
				ip:
					icon: '/images/tree-icons/ip.png'
					valid_children: ['module', 'topmodule']
				exip:
					icon: '/images/tree-icons/excluded-verilog.png'
					valid_children: ['module', 'topmodule']
				testbench:
					icon: '/images/tree-icons/TB.png'
					valid_children: []
				netlist:
					icon: '/images/tree-icons/NTL.png'
					valid_children: []
				srpt:
					icon: '/images/tree-icons/TXT.png'
					valid_children: []
				text:
					icon: '/images/tree-icons/TXT.png'
					valid_children: []
				vcd:
					icon: '/images/tree-icons/VCD.png'
					valid_children: []
				fsm:
					icon: '/images/tree-icons/FSM.png'
					valid_children: []
				soc:
					icon: '/images/tree-icons/Blank.png'
					valid_children: []
				cpp:
					icon: '/images/tree-icons/Blank.png'
					valid_children: []
				hpp:
					icon: '/images/tree-icons/Blank.png'
					valid_children: []
				obj:
					icon: '/images/tree-icons/Blank.png'
					valid_children: []
				hex:
					icon: '/images/tree-icons/Blank.png'
					valid_children: []
				system:
					icon: '/images/tree-icons/Blank.png'
					valid_children: []
				sta:
					icon: '/images/tree-icons/Blank.png'
					valid_children: []
				bin:
					icon: '/images/tree-icons/BIN.png'
					valid_children: []
				pcf:
					icon: '/images/tree-icons/PCF.png'
					valid_children: []
				module:
					icon: '/images/tree-icons/MOD2.png'
					valid_children: []
				topmodule:
					icon: '/images/tree-icons/topmodule.png'
					valid_children: []
		contextmenu:
			items: ($node) ->
				Create:
					label: 'Create New'
					icon: no
					action: (obj) ->
						@create obj

		core:
			themes:
				name: 'default-dark'
				dots: no
			multiple: no
			check_callback: (operation, node, nodeParent, node_position, more) ->
				return yes
				if operation is 'move_node'
					unless nodeParent.type in ['folder', 'root']
						return no
				else if operation is 'copy_node'
					unless nodeParent.type in ['folder', 'root']
						return no
				else
					yes
			data: [] #sampleFiles

			).on('contextmenu', '.jstree-anchor, .jstree-icon, .jstree-wholerow', ((e, b) ->
				node = $(e.target).closest("li")
				if node.length
					contextId = node.attr 'id'
			)).bind('hover_node.jstree', ((e, data) ->
				highlightedId = data.node.id
			)).bind('dehover_node.jstree', ((e, data) ->
				highlightedId = null
			)).bind('dblclick.jstree', ((e) ->
				node = $(e.target).closest("li")
				if node.length
					nodeId = node.attr 'id'
					if nodeId? and nodeId.trim() isnt ''
						openFile()
			)).bind('paste.jstree', (() ->

			)).bind('copy_node.jstree', ((e, data) ->
				pasteId = data.node.id

			)).bind('move_node.jstree', ((e, data) ->
				pasteId = data.node.id
			)).bind('select_node.jstree', ((e, data) ->
				if not searchCleared
					$('#files').jstree(yes).search('')
					searchCleared = yes
			)).bind('keypress', ((e, data) ->
				if e.keyCode is 127
					deleteFile(no)
			))

	setTreeData = (treeData) ->
		$('#files').jstree(yes).settings.core.data = treeData
		$('#files').jstree(yes).refresh()

	copyText = (text) ->
		textArea = document.createElement('textarea')
		textArea.style.position = 'fixed'
		textArea.style.top = 0
		textArea.style.left = 0
		textArea.style.width = '2em'
		textArea.style.height = '2em'
		textArea.style.padding = 0
		textArea.style.border = 'none'
		textArea.style.outline = 'none'
		textArea.style.boxShadow = 'none'
		textArea.style.background = 'transparent'
		textArea.value = text
		document.body.appendChild textArea
		textArea.select()
		try
			successful = document.execCommand('copy')
			unless successful
				promptCopy text
		catch err
			promptCopy text
		document.body.removeChild textArea
		return
	promptCopy = (text) ->
		window.prompt 'Copy to clipboard: Ctrl/Command + C, Enter', text

	$('#console').contextmenu
		menu:
			[
				{
					title: 'Clear'
					cmd: 'clear'
				}
				{
					title: 'Copy'
					cmd: 'copy'
				}
			]
		close: (event) ->

		beforeOpen: (event, ui) ->
			target = $(ui.target)
			if target.is('li') and target.hasClass('ui-widget-content')
				$('#console').contextmenu 'enableEntry', 'copy', yes
			else
				$('#console').contextmenu 'enableEntry', 'copy', no
		select: (event, ui) ->
			if ui.cmd is 'clear'
				clearInfoLogs()
			else if ui.cmd is 'copy'
				target = $(ui.target)
				copyText target.html()

	$('#errors').contextmenu
		menu:
			[
				{
					title: 'Clear'
					cmd: 'clear'
				}
				{
					title: 'Copy'
					cmd: 'copy'
				}
			]
		close: (event) ->

		beforeOpen: (event, ui) ->
			target = $(ui.target)
			if target.is('li') and target.hasClass('ui-widget-content')
				$('#errors').contextmenu 'enableEntry', 'copy', yes
			else
				$('#errors').contextmenu 'enableEntry', 'copy', no
		select: (event, ui) ->
			if ui.cmd is 'clear'
				clearErrorLogs()
			else if ui.cmd is 'copy'
				target = $(ui.target)
				copyText target.html()

	$('#warnings').contextmenu
		menu:
			[
				{
					title: 'Clear'
					cmd: 'clear'
				}
				{
					title: 'Copy'
					cmd: 'copy'
				}
			]
		close: (event) ->

		beforeOpen: (event, ui) ->
			target = $(ui.target)
			if target.is('li') and target.hasClass('ui-widget-content')
				$('#warnings').contextmenu 'enableEntry', 'copy', yes
			else
				$('#warnings').contextmenu 'enableEntry', 'copy', no
		select: (event, ui) ->
			if ui.cmd is 'clear'
				clearWarningLogs()
			else if ui.cmd is 'copy'
				target = $(ui.target)
				copyText target.html()


	$('#files').contextmenu
		delegate: '.tree-item'
		position: (event, ui) ->
							{my: "left top", at: "center", of: event, collision: "flipfit"}
		menu:
			[
				{
					title: 'Set As Top Module'
					cmd: 'settop'
				}
				{
					title: 'New'
					cmd: 'new'
					children: newMenuChildren
				}
				{
					title: 'New Folder'
					cmd: 'newfolder'
				}
				{
					title: 'Open'
					cmd: 'open'
				}
				{
					title: '----'
					cmd: 'first-seperator'
				}
				{
					title: 'Copy'
					cmd: 'copy'
				}
				{
					title: 'Cut'
					cmd: 'cut'
				}
				{
					title: 'Paste'
					cmd: 'paste'
				}
				{
					title: 'Rename'
					cmd: 'rename'
				}
				{
					title: 'Delete'
					cmd: 'delete'
				}
				{
					title: '----'
					cmd: 'second-seperator'
				}
				{
					title: 'Duplicate'
					cmd: 'duplicate'
				}
				{
					title: 'Download'
					cmd: 'download-file'
				}
				{
					title: '----'
					cmd: 'third-seperator'
				}
				{
					title: 'Exclude from Build'
					cmd: 'exclude'
				}
				{
					title: 'Include in Build'
					cmd: 'include'
				}
				{
					title: 'Convert into Testbench'
					cmd: 'totestbench'
				}
				{
					title: 'Convert into Module'
					cmd: 'toverilog'
				}
				{
					title: 'Close'
					cmd: 'close'
				}
			]
		beforeOpen: (event, ui) ->
			contextNode = $('#files').jstree(yes).get_node contextId
			nodeType = contextNode.type

			$('#files').contextmenu 'showEntry', 'settop', yes
			$('#files').contextmenu 'showEntry', 'new', yes
			$('#files').contextmenu 'showEntry', 'newfolder', yes
			$('#files').contextmenu 'showEntry', 'open', yes
			$('#files').contextmenu 'showEntry', 'first-seperator', yes
			$('#files').contextmenu 'showEntry', 'copy', yes
			$('#files').contextmenu 'showEntry', 'cut', yes
			$('#files').contextmenu 'showEntry', 'paste', yes
			$('#files').contextmenu 'showEntry', 'rename', yes
			$('#files').contextmenu 'showEntry', 'delete', yes
			$('#files').contextmenu 'showEntry', 'second-seperator', yes
			$('#files').contextmenu 'showEntry', 'duplicate', yes
			$('#files').contextmenu 'showEntry', 'download-file', yes
			$('#files').contextmenu 'showEntry', 'third-seperator', yes
			$('#files').contextmenu 'showEntry', 'exclude', yes
			$('#files').contextmenu 'showEntry', 'include', yes
			$('#files').contextmenu 'showEntry', 'toverilog', yes
			$('#files').contextmenu 'showEntry', 'totestbench', yes
			$('#files').contextmenu 'showEntry', 'close', yes

			$('#files').contextmenu 'enableEntry', 'copy', yes
			$('#files').contextmenu 'enableEntry', 'cut', yes
			$('#files').contextmenu 'enableEntry', 'paste', yes
			$('#files').contextmenu 'enableEntry', 'duplicate', yes

			parentNode = getNodeById(contextNode.parent)

			if parentNode.type is 'buildFolder'
				$('#files').contextmenu 'enableEntry', 'copy', no
				$('#files').contextmenu 'enableEntry', 'cut', no
				$('#files').contextmenu 'enableEntry', 'duplicate', no

			if nodeType is 'buildFolder'
				$('#files').contextmenu 'showEntry', 'copy', no
				$('#files').contextmenu 'showEntry', 'cut', no
				$('#files').contextmenu 'showEntry', 'rename', no
				$('#files').contextmenu 'showEntry', 'delete', no

			if not $('#files').jstree(yes).can_paste() or nodeType is 'buildFolder'
				$('#files').contextmenu 'enableEntry', 'paste', no

			if nodeType isnt 'verilog' and nodeType isnt 'ip'
				$('#files').contextmenu 'showEntry', 'exclude', no

			if nodeType isnt 'exverilog' and nodeType isnt 'exip'
				$('#files').contextmenu 'showEntry', 'include', no

			if nodeType isnt 'verilog' and nodeType isnt 'exverilog'
				$('#files').contextmenu 'showEntry', 'totestbench', no

			if nodeType isnt 'testbench'
				$('#files').contextmenu 'showEntry', 'toverilog', no

			if nodeType is 'folder' or nodeType is 'root' or nodeType is 'buildFolder'
				$('#files').contextmenu 'showEntry', 'settop', no
				$('#files').contextmenu 'showEntry', 'open', no
				$('#files').contextmenu 'showEntry', 'second-seperator', no
				$('#files').contextmenu 'showEntry', 'duplicate', no
				$('#files').contextmenu 'showEntry', 'download-file', no
				$('#files').contextmenu 'showEntry', 'third-seperator', no
				$('#files').contextmenu 'showEntry', 'close', no
			else if nodeType is 'module'
				$('#files').contextmenu 'showEntry', 'new', no
				$('#files').contextmenu 'showEntry', 'newfolder', no
				$('#files').contextmenu 'showEntry', 'open', no
				$('#files').contextmenu 'showEntry', 'first-seperator', no
				$('#files').contextmenu 'showEntry', 'copy', no
				$('#files').contextmenu 'showEntry', 'cut', no
				$('#files').contextmenu 'showEntry', 'paste', no
				$('#files').contextmenu 'showEntry', 'rename', no
				$('#files').contextmenu 'showEntry', 'delete', no
				$('#files').contextmenu 'showEntry', 'second-seperator', no
				$('#files').contextmenu 'showEntry', 'duplicate', no
				$('#files').contextmenu 'showEntry', 'download-file', no
				$('#files').contextmenu 'showEntry', 'third-seperator', no
				$('#files').contextmenu 'showEntry', 'close', no
			else if nodeType is 'topmodule'
				# $('#files').contextmenu 'showEntry', 'settop', no
				$('#files').contextmenu 'showEntry', 'new', no
				$('#files').contextmenu 'showEntry', 'newfolder', no
				$('#files').contextmenu 'showEntry', 'open', no
				$('#files').contextmenu 'showEntry', 'first-seperator', no
				$('#files').contextmenu 'showEntry', 'copy', no
				$('#files').contextmenu 'showEntry', 'cut', no
				$('#files').contextmenu 'showEntry', 'paste', no
				$('#files').contextmenu 'showEntry', 'rename', no
				$('#files').contextmenu 'showEntry', 'delete', no
				$('#files').contextmenu 'showEntry', 'second-seperator', no
				$('#files').contextmenu 'showEntry', 'duplicate', no
				$('#files').contextmenu 'showEntry', 'download-file', no
				$('#files').contextmenu 'showEntry', 'third-seperator', no
				$('#files').contextmenu 'showEntry', 'close', no
			else
				$('#files').contextmenu 'showEntry', 'paste', no
				$('#files').contextmenu 'showEntry', 'settop', no
				# $('#files').contextmenu 'showEntry', 'new', no
				$('#files').contextmenu 'showEntry', 'newfolder', no
		close: (event) ->

		select: (event, ui) ->
			selectedItem = $('#files').jstree('get_selected')
			if contextId?
				contextMenuHandler ui.cmd, yes


	addEditorTab = (title, fileId) ->
		tabOptions =
			title: title
		fileNode = getNodeById fileId
		if fileNode
			tabOptions.favicon = fileNode.icon
		createdTab = $(tabManager.addTab(tabOptions))
		createdTab.data 'fileId', fileId
		tabId = "tabs-#{fileId}"
		if getTabById tabId
			setActiveEditorTabById tabId
		else
			tabContentId = "#{tabId}-content"
			createdTab.attr 'id', tabId
			$('#tab-content').append "<div id=\"#{tabContentId}\" class=\"editor-tab-content\"></div>"
			tabChangeHandler tabId
		return tabId

	setTabTitle = (tabId, newTitle) ->
		tabEl = $("##{tabId}").get(0)
		tabManager.updateTab tabEl, title: newTitle

	attachEditor = (tabId, file, defaultValue = '') ->
		tabContentId = "#{tabId}-content"
		editorTab = $("##{tabId}")
		editorTabContent = $("##{tabContentId}")
		editorId = "editor-#{file.id}-#{tabId}"
		editorTabContent.append "<div class=\"editor\" id=\"#{editorId}\"></div>"
		editor = ace.edit(editorId)

		if defaultThemeIndex is 1
			editor.setTheme 'ace/theme/crimson_editor'
		else
			editor.setTheme 'ace/theme/iplastic'
		editor.setFontSize defaultFontSize
		editor.setValue defaultValue
		editor.getSession().setUndoManager new ace.UndoManager()

		if file.type in ['verilog', 'exverilog', 'testbench']
			editor.setOptions
				enableSnippets: true
				enableLiveAutocompletion: true
				enableBasicAutocompletion: true
				showPrintMargin: false
				blockScrolling = Infinity
			editor.getSession().setMode 'ace/mode/verilog'
		else if file.type in ['cpp', 'hpp']
			editor.setOptions
				enableSnippets: true
				enableLiveAutocompletion: true
				enableBasicAutocompletion: true
				showPrintMargin: false
				blockScrolling = Infinity
			editor.getSession().setMode 'ace/mode/c_cpp'
		else if file.type is 'netlist'
			editor.setOptions
				enableSnippets: false
				enableLiveAutocompletion: false
				enableBasicAutocompletion: false
				showPrintMargin: false
				readOnly: yes
				blockScrolling = Infinity
			editor.getSession().setMode 'ace/mode/verilog'
		else if file.type in ['ip', 'exip']
			editor.setOptions
				enableSnippets: false
				enableLiveAutocompletion: false
				enableBasicAutocompletion: false
				showPrintMargin: false
				readOnly: yes
				blockScrolling = Infinity
			editor.getSession().setMode 'ace/mode/json'
		else
			editor.setOptions
				enableSnippets: false
				enableLiveAutocompletion: false
				enableBasicAutocompletion: false
				showPrintMargin: false
				blockScrolling = Infinity
		editor.$blockScrolling = Infinity

		editor.on 'blur', (e) ->
			hideEditorSnippet editor

		editor.on 'focus', (e) ->
			if editor.reselect
				selectNode file.id if file? and file.id?
				editor.reselect = no
			else
				editor.reselect = yes
				editor.focus()

		editor.on 'change', (e) ->
			if editorTab.data 'saved'
				editorTab.data 'saved', no
				setTabTitle tabId, editorTab.data('title') + ' *'

		editor.commands.addCommand
			name: 'saveOpenTab'
			bindKey: {win: 'Ctrl-S',  mac: 'Command-S'}
			exec: ((ed) ->
				if not ed.$readOnly then saveOpenTab()
			)
			readOnly: yes

		setTabTitle tabId, file.text

		editor.tab = editorTab

		editorTab.data 'title', file.text
		editorTab.data 'fileId', file.id
		editorTab.data 'editor', editor
		editorTab.data 'saved', yes

		editor.reselect = yes


		editor

	attachFSM = (tabId, file, fsmData, fsmType)->
		try
			fsmTab = $("##{tabId}")
			fsmTabContent = $("##{tabId}-content")
			fsmId = "fsm-#{file.id}-#{tabId}-#{tabId}-#{Date.now()}-#{('' + Math.random()).split('.')[1]}"
			fsmDiv = $("<div class=\"fsm\" id=\"#{fsmId}\"></div>")
			fsmTabContent.append fsmDiv
			fsmView = new FSM fsmId, fsmData, FSMType: fsmType or 0

			setTabTitle tabId, file.text

			fsmView.tab = fsmTab

			fsmView.onCompile (formAttrs, fsmContent) ->
				if not formAttrs.module or formAttrs.module.trim() is ''
					return displayError error: 'Module Name is required.'
				if not formAttrs.inports or formAttrs.inports.trim() is ''
					return displayError error: 'Input Ports are required.'
				if not formAttrs.outports or formAttrs.outports.trim() is ''
					return displayError error: 'Output Ports are required.'
				if not formAttrs.encoding or formAttrs.encoding.trim() is ''
					return displayError error: 'Encoding is required.'
				if not formAttrs.clkName or formAttrs.clkName.trim() is ''
					return displayError error: 'Clock signal is required.'
				if not formAttrs.clkEdge or formAttrs.clkEdge.trim() is ''
					return displayError error: 'Clock edge is required.'
				if not formAttrs.rstName or formAttrs.rstName.trim() is ''
					return displayError error: 'Reset signal is required.'
				if not formAttrs.rstEdge or formAttrs.rstEdge.trim() is ''
					return displayError error: 'Reset edge is required.'
				if not formAttrs.rstMode or formAttrs.rstMode.trim() is ''
					return displayError error: 'Reset mode is required.'
				if not formAttrs.rstLevel or formAttrs.rstLevel.trim() is ''
					return displayError error: 'Reset level is required.'
				formAttrs.item = file.id
				formAttrs.action = 'compilefsm'
				saveAll no, (err, cancelled) ->
					return if cancelled
					if err
						displayError err
					else
						loadingOn('Compiling Finite State Machine..')
						request Urls.ajax, 'POST', formAttrs, ((res) ->
							if res and res.status is 1
								fsmView.setOutput res.content
								fsmView.changeTab 'output'
							else
								errors = res.log.errors
								clearAllGrids()
								for err in errors
									logError message: err.error
								if errors.length > 0
									setLogTab 1
							loadingOff()
						), (error) ->
							loadingOff()
							displayError error

			fsmView.onSaveVerilog (verilogCode) ->
				newVerilogFromFSM verilogCode


			fsmView.onUpdate (ev) ->
				if fsmTab.data 'saved'
					fsmTab.data 'saved', no
					setTabTitle tabId, file.text + ' *'

			fsmView.onSave (ev) ->
				saveOpenTab()


			fsmTab.data 'title', file.text
			fsmTab.data 'fileId', file.id
			fsmTab.data 'fsm', fsmView
			fsmTab.data 'saved', yes

			fsmView
		catch parseErr
			console.error parseErr
			displayError error: "Failed to parse the FSM."

	attachSOC = (tabId, file, components) ->
		socTab = $("##{tabId}")
		socTabContent = $("##{tabId}-content")
		socId = "soc-#{file.id}-#{(Math.random() + '').split('.')[1]}"
		socDiv = $("<div class=\"soc\" id=\"#{socId}\"></div>")
		socTabContent.append socDiv
		if typeof components is 'string'
			components = JSON.parse components
		soc = new SOC socId, components
		soc.setOnChangeListener (e) ->
			if socTab.data 'saved'
				socTab.data 'saved', no
				setTabTitle tabId, file.text + ' *'
		soc.setOnSaveListener (diagram) ->
			saveOpenTab()

		soc.tab = socTab

		setTabTitle tabId, file.text

		socTab.data 'title', file.text
		socTab.data 'fileId', file.id
		socTab.data 'soc', soc
		socTab.data 'saved', yes

		soc
	attachSYS = (tabId, file, components) ->
		sysTab = $("##{tabId}")
		sysTabContent = $("##{tabId}-content")
		sysId = "sys-#{file.id}-#{(Math.random() + '').split('.')[1]}"
		sysDiv = $("<div class=\"sys\" id=\"#{sysId}\"></div>")
		sysTabContent.append sysDiv
		sys = new SystemEditor sysId, components
		###soc.setOnChangeListener (e) ->
			if socTab.data 'saved'
				socTab.data 'saved', no
				setTabTitle tabId, file.text + ' *'
		soc.setOnSaveListener (timingDiagram) ->
			saveOpenTab()
		###
		soc.tab = socTab

		setTabTitle tabId, file.text

		socTab.data 'title', file.text
		socTab.data 'fileId', file.id
		socTab.data 'soc', soc
		socTab.data 'saved', yes

		soc


	attachWaveformViewer = (tabId, file, wave, timing) ->
		waveformTab = $("##{tabId}")
		waveformTabContent = $("##{tabId}-content")
		waveformId = "waveform-#{file.id}-#{(Math.random() + '').split('.')[1]}"
		waveformDiv = $("<div class=\"waveform\" id=\"#{waveformId}\"></div>")
		waveformTabContent.append waveformDiv
		timing = if typeof timing is 'object' then timing else null
		waveform = new Waveform waveformId, wave, timing
		waveform.setOnChangeListener (e) ->
			if waveformTab.data 'saved'
				waveformTab.data 'saved', no
				setTabTitle tabId, file.text + ' *'
		waveform.setOnSaveListener (timingDiagram) ->
			saveOpenTab()

		waveform.tab = waveformTab

		setTabTitle tabId, file.text

		waveformTab.data 'title', file.text
		waveformTab.data 'fileId', file.id
		waveformTab.data 'waveform', waveform
		waveformTab.data 'saved', yes

		waveform

	attachSTA = (tabId, file, report) ->
		staTab = $("##{tabId}")
		staTabContent = $("##{tabId}-content")
		staId = "sta-#{file.id}"
		staDiv = $("<div class=\"sta\" id=\"#{staId}\"></div>")
		staTabContent.append staDiv
		sta = new STA staId, report

		sta.tab = staTab

		setTabTitle tabId, file.text

		staTab.data 'title', file.text
		staTab.data 'fileId', file.id
		staTab.data 'sta', sta
		staTab.data 'saved', yes

		sta

	createAceTab = (fileNode, content = '') ->
		id = "tabs-#{fileNode.id}"
		if getTabById id
			setActiveEditorTabById id
		else
			tabId = addEditorTab fileNode.text, fileNode.id
			editor = attachEditor tabId, fileNode, content
			editor.clearSelection()
			editor.gotoLine(0)
			editor.focus()
			editor

	createSTATab = (fileNode, content = '') ->
		id = "tabs-#{fileNode.id}"
		if getTabById id
			setActiveEditorTabById id
		else
			tabId = addEditorTab fileNode.text, fileNode.id
			viewer = attachSTA tabId, fileNode, content
			viewer

	createFSMTab = (fileNode, content, fsmType) ->
		id = "tabs-#{fileNode.id}"
		if getTabById id
			setActiveEditorTabById id
		else
			tabId = addEditorTab fileNode.text, fileNode.id
			fsm = attachFSM tabId, fileNode, content, fsmType
			fsm
	createSYSTab = (fileNode, content) ->
		id = "tabs-#{fileNode.id}"
		if getTabById id
			setActiveEditorTabById id
		else
			tabId = addEditorTab fileNode.text, fileNode.id
			sys = attachSYS tabId, fileNode, content
			sys
	createSOCTab = (fileNode, content) ->
		id = "tabs-#{fileNode.id}"
		if getTabById id
			setActiveEditorTabById id
		else
			tabId = addEditorTab fileNode.text, fileNode.id
			soc = attachSOC tabId, fileNode, content
			soc

	createWaveformTab = (fileNode, content, timing) ->
		id = "tabs-#{fileNode.id}"
		if getTabById id
			setActiveEditorTabById id
		else
			tabId = addEditorTab fileNode.text, fileNode.id
			waveform = attachWaveformViewer tabId, fileNode, content, timing
			waveform
	createPCFEditor = (fileNode, content) ->
		loadingOn 'Retrieving model details..'
		getBoardsInfo (err, boards) ->
			loadingOff()
			if err
				loadingOff()
				displayError err
			else
				firstSelected = no
				targetBoard = undefined
				for board in boards
					if board.id is content.boardId
						targetBoard = board
						break
				return unless targetBoard?

				pinIndex = 0
				portsList = ""
				portMap = {}
				for port, pin of content.assignedPins
					pinList = "<option value=\"unassigned\">Unassigned</option>"
					for option in targetBoard.pins
						if option is pin
							pinList = "\t#{pinList}<option value=\"#{option}\" selected=\"selected\">#{option}</option>\n"
						else
							pinList = "\t#{pinList}<option value=\"#{option}\">#{option}</option>\n"
					portMap[port] = 'options-list-' + pinIndex
					pinList = "<select class=\"prompt-select\" name=\"options-list\" tabindex=\"0\" id=\"options-list-#{pinIndex++}\" style=\"width: 100%;\">\n#{pinList}</select>"
					portsList = """#{portsList}<label for="options-list-#{pinIndex++}" class=\"prompt-label\">#{port}: </label>
					#{pinList}
					"""
				for port in content.unassignedPins
					defaultPinsList = "<option value=\"unassigned\" selected=\"selected\">Unassigned</option>\n"
					for option in targetBoard.pins
						defaultPinsList = "\t#{defaultPinsList}<option value=\"#{option}\">#{option}</option>\n"
					portMap[port] = 'options-list-' + pinIndex
					defaultPinsList = "<select class=\"prompt-select\" name=\"options-list\" tabindex=\"0\" id=\"options-list-#{pinIndex++}\" style=\"width: 100%;\">\n#{defaultPinsList}</select>"

					portsList = """#{portsList}<label for="options-list" class=\"prompt-label\">#{port}: </label>
					#{defaultPinsList}
					"""



				htmlContent = """<form action=\"#\" id=\"new-file-form\">
					<fieldset class="ui-helper-reset prompt-fieldset">
						<label for="options-list" class=\"prompt-label\">Assign Pins (<i>Board #{content.boardName} - #{content.boardId})</i></label>
						<br>
						#{portsList}
					</fieldset>
				</form>
				"""

				$('#prompt-dialog').html htmlContent

				$('#new-file-form').on 'submit', (e) ->
					e.preventDefault()
					e.stopPropagation()


				$('#prompt-dialog').html htmlContent
				$('#new-file-form').on 'submit', (e) ->
					e.preventDefault()
					e.stopPropagation()
				title = "PCF Editor: #{fileNode.text}"
				confirmed = no
				unassignedPins = []
				assignedPins = {}
				alertify.pcfEditorDialog or alertify.dialog 'pcfEditorDialog',(->
					main: (content) ->
						@setContent content
					prepare: ->
						confirmed = no
						unassignedPins = []
						assignedPins = {}
					setup: ->
							# focus:
							# 	element: '#file_title'
							# 	select: yes
							options:
								title: title
								maximizable: yes
								resizable: yes
								padding: yes
								closableByDimmer: no
								transition:'zoom'
							buttons:[
								{
									text: 'Save'
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
						target: null
					callback: (closeEvent) ->
								if closeEvent.index is 0
									confirmed = yes
									for port, elId of portMap
										select = $("##{elId}")
										if select.length
											value = select.val()
											if value.trim() is '' or value is 'unassigned'
												unassignedPins.push port
											else
												assignedPins[port] = value
					hooks:
						onclose: ->
							if confirmed
								newContent =
									unassignedPins: unassignedPins
									assignedPins: assignedPins
								saveFile @settings.target.id, JSON.stringify(newContent), (err, fileId, fileName, fileType, newContent, modules) ->
									if err
										return displayError err


				), yes
				dialogInstance = alertify.pcfEditorDialog($('#prompt-dialog').get(0))
											.set('title', title)
											.set('target', fileNode)
											.resizeTo('500px', '60%');



	setActiveEditorTabById = (tabId) ->
		el = $("##{tabId}").get(0)
		tabManager.setCurrentTab el



	getActiveEditorTabId = ->
		if tabManager?
			activeTab = tabManager.activeTab
			if activeTab?
				return $(tabManager.activeTab).attr('id')
		''

	getActiveEditor = ->
		tabId = getActiveEditorTabId()
		return null unless tabId?
		editor = $("##{tabId}").data 'editor'
		editor ? no

	getActiveWaveform = ->
		tabId = getActiveEditorTabId()
		return null unless tabId?
		waveform = $("##{tabId}").data 'waveform'
		waveform ? no

	getActiveFSM = ->
		tabId = getActiveEditorTabId()
		return null unless tabId?
		fsm = $("##{tabId}").data 'fsm'
		fsm ? no
	getActiveSOC = ->
		tabId = getActiveEditorTabId()
		return null unless tabId?
		soc = $("##{tabId}").data 'soc'
		soc ? no
	getActiveSYS = ->
		tabId = getActiveEditorTabId()
		return null unless tabId?
		sys = $("##{tabId}").data 'sys'
		sys ? no

	getTabById = (tabId) ->
		tab = $("##{tabId}")
		if not tab.length
			no
		else
			tab

	getAllTabIds = ->
		tabIds = []
		tabDivs = $('.chrome-tab')
		tabDivs.each (ind, tabDiv) ->
			tabIds.push $(tabDiv).attr 'id'
		tabIds

	saveAll = (includeWaveforms, cb) ->
		if typeof includeWaveforms is 'function'
			cb = includeWaveforms
			includeWaveforms =  yes
		tabs = getAllTabIds()
		notSavedTabs = []
		tabs.forEach (tabId) ->
			isSaved = $("##{tabId}").data 'saved'
			if isSaved? and not isSaved
				notSavedTabs.push tabId
		if notSavedTabs.length is 0
			return cb null, no
		else
			dialogTitle = "Save Open Tabs"
			dialogMessage = "<p>Do you want to save open tabs?</p>"
			confirmationDialog dialogTitle, dialogMessage, (accepted) ->
				if accepted
					savedTabs = 0
					notSavedTabs.forEach (tabId, tabInd) ->
						tab = $("##{tabId}")
						fileId = tab.data 'fileId'
						editor = tab.data 'editor'
						waveform = tab.data 'waveform'
						fsm = tab.data 'fsm'
						soc = tab.data 'soc'
						sys = tab.data 'sys'

						newContent = undefined
						if editor
							newContent = editor.getValue()
						else if fsm
							newContent = JSON.stringify(fsm.ExportAsJSON())
						else if sys
							newContent = JSON.stringify(sys.exportJSON())
						else if soc
							newContent = JSON.stringify(soc.exportJSON())
						else if waveform
							newContent = waveform.exportTimingDiagram()
						else
							savedTabs++
							return console.warn 'Cannot find the editor.'

						saveFile fileId, newContent, (err, fileId, fileName, fileType, newContent, modules) ->
							if not err
								savedTabs++
								if fileType in ['verilog', 'exverilog']
									deleteChildren fileId
									for module in modules
										moduleId = "#{module}_#{fileName}_#{module}_#{(new Date).valueOf()}_#{('' + Math.random()).split('.')[1]}"
										if fileId is topModuleEntry and module is topModule
											createNode moduleId, fileId, module, 'topmodule'
											topModuleId = moduleId
										else
											createNode moduleId, fileId, module, 'module'
								tab.data 'saved', yes
								setTabTitle tabId, fileName

							if savedTabs is notSavedTabs.length
								cb null, no
							else if tabInd is notSavedTabs.length - 1
								cb error: 'Could not save all open tabs.', no
				else
					return cb null, yes
			null

	hideEditorSnippet = (editor) ->
		if editor?
			if editor.completer?
				if editor.completer.getPopup()
					editor.completer.getPopup().hide()

	forceCloseTab = (tabId, cb) ->
		tab = $("##{tabId}")
		if tab.length
			tabManager.removeTab tab.get(0)

	closeTab = (tabId, cb)->
		tab = $("##{tabId}")
		editor = tab.data 'editor'
		fsm = tab.data 'fsm'
		waveform = tab.data 'waveform'
		soc = tab.data 'soc'
		sys = tab.data 'sys'

		_remove = ->
			tabManager.removeTab tab.get(0)
			if typeof cb is 'function'
				cb()

		hideEditorSnippet editor

		if editor? and not tab.data 'saved'
			fileName = tab.data 'title'
			dialogTitle = "Save #{fileName}"
			dialogMessage = "<p>Do you want to save \"#{fileName}\" before closing?</p>"
			promptDialog dialogTitle, dialogMessage, (accepted, cancelled) ->
				return if cancelled
				if accepted
					fileId = tab.data 'fileId'
					newContent = editor.getValue()
					saveFile fileId, newContent, (err, fileId, fileName, fileType, newContent, modules) ->
						if err
							return displayError err
						else
							if fileType in ['verilog', 'exverilog']
								deleteChildren fileId
								for module in modules
									moduleId = "#{module}_#{fileName}_#{module}_#{(new Date).valueOf()}_#{('' + Math.random()).split('.')[1]}"
									if fileId is topModuleEntry and module is topModule
										createNode moduleId, fileId, module, 'topmodule'
										topModuleId = moduleId
									else
										createNode moduleId, fileId, module, 'module'
							tab.data 'saved', yes
							setTabTitle tabId, fileName
							_remove()
				else
					_remove()
		else if fsm and not tab.data 'saved'
			fileName = tab.data 'title'
			dialogTitle = "Save #{fileName}"
			dialogMessage = "<p>Do you want to save \"#{fileName}\" before closing?</p>"
			promptDialog dialogTitle, dialogMessage, (accepted, cancelled) ->
				return if cancelled
				if accepted
					fileId = tab.data 'fileId'
					newContent = JSON.stringify(fsm.ExportAsJSON())
					saveFile fileId, newContent, (err, fileId, fileName, fileType, newContent, modules) ->
						if err
							return displayError err
						else
							tab.data 'saved', yes
							setTabTitle tabId, fileName
							_remove()
				else
					_remove()
		else if soc and not tab.data 'saved'
			fileName = tab.data 'title'
			dialogTitle = "Save #{fileName}"
			dialogMessage = "<p>Do you want to save \"#{fileName}\" before closing?</p>"
			promptDialog dialogTitle, dialogMessage, (accepted, cancelled) ->
				return if cancelled
				if accepted
					fileId = tab.data 'fileId'
					newContent = JSON.stringify(soc.exportJSON())
					saveFile fileId, newContent, (err, fileId, fileName, fileType, newContent, modules) ->
						if err
							return displayError err
						else
							tab.data 'saved', yes
							setTabTitle tabId, fileName
							_remove()
				else
					_remove()
		else if sys and not tab.data 'saved'
			fileName = tab.data 'title'
			dialogTitle = "Save #{fileName}"
			dialogMessage = "<p>Do you want to save \"#{fileName}\" before closing?</p>"
			promptDialog dialogTitle, dialogMessage, (accepted, cancelled) ->
				return if cancelled
				if accepted
					fileId = tab.data 'fileId'
					newContent = JSON.stringify(sys.exportJSON())
					saveFile fileId, newContent, (err, fileId, fileName, fileType, newContent, modules) ->
						if err
							return displayError err
						else
							tab.data 'saved', yes
							setTabTitle tabId, fileName
							_remove()
				else
					_remove()
		else if waveform and not tab.data 'saved'
			fileName = tab.data 'title'
			dialogTitle = "Save #{fileName}"
			dialogMessage = "<p>Do you want to save the timing diagram \"#{fileName}\" before closing?</p>"
			promptDialog dialogTitle, dialogMessage, (accepted, cancelled) ->
				return if cancelled
				if accepted
					fileId = tab.data 'fileId'
					newContent = waveform.exportTimingDiagram()
					saveFile fileId, newContent, (err, fileId, fileName, fileType, newContent, modules) ->
						if err
							return displayError err
						else
							tab.data 'saved', yes
							setTabTitle tabId, fileName
							_remove()
				else
					_remove()
		else
			_remove()
		tabId


	$('#btn-new-tab').button(
			text: no
			icons:
				primary: 'ui-icon-plusthick'
		).click (e) ->
			$('#btn-new-tab').contextmenu('open', $('#btn-new-tab'))

	$('#btn-new-tab').contextmenu
		autoTrigger: no
		menu: newMenuChildren
		close: (event) ->

		beforeOpen: (event, ui) ->
			topFolder = getTopFolderNode()
			if topFolder.type is 'buildFolder'
				$('#btn-new-tab').contextmenu 'enableEntry', 'newverilog', no
				$('#btn-new-tab').contextmenu 'enableEntry', 'newtestbench', no
				$('#btn-new-tab').contextmenu 'enableEntry', 'newfsm', no
				$('#btn-new-tab').contextmenu 'enableEntry', 'newsys', no
				$('#btn-new-tab').contextmenu 'enableEntry', 'newsoc', no
				$('#btn-new-tab').contextmenu 'enableEntry', 'newtext', no
				$('#btn-new-tab').contextmenu 'enableEntry', 'newip', no
				$('#btn-new-tab').contextmenu 'enableEntry', 'newpcf', no
				$('#btn-new-tab').contextmenu 'enableEntry', 'newcpp', no
				$('#btn-new-tab').contextmenu 'enableEntry', 'newhpp', no
			else
				$('#btn-new-tab').contextmenu 'enableEntry', 'newverilog', yes
				$('#btn-new-tab').contextmenu 'enableEntry', 'newtestbench', yes
				$('#btn-new-tab').contextmenu 'enableEntry', 'newfsm', yes
				$('#btn-new-tab').contextmenu 'enableEntry', 'newsoc', yes
				$('#btn-new-tab').contextmenu 'enableEntry', 'newsys', yes
				$('#btn-new-tab').contextmenu 'enableEntry', 'newtext', yes
				$('#btn-new-tab').contextmenu 'enableEntry', 'newip', yes
				$('#btn-new-tab').contextmenu 'enableEntry', 'newpcf', yes
				$('#btn-new-tab').contextmenu 'enableEntry', 'newcpp', yes
				$('#btn-new-tab').contextmenu 'enableEntry', 'newhpp', yes

		select: (event, ui) ->
			contextMenuHandler ui.cmd


	getProjectTree = (filter = '', cb) ->
		if typeof filter is 'function'
			cb = filter
			filter = ''
		filter = filter.trim()
		requestUrl =  Urls.retrieve.tree
		if filter isnt ''
			requestUrl = "#{requestUrl}?filter=#{filter}"

		request requestUrl, 'GET', {}, ((res) ->
			res.files.sort (a, b) ->
				a.text.toLowerCase().localeCompare b.text.toLowerCase()

			cb null, res.files, res.build, res.topModule, res.topModuleEntry
		), (error) ->
			cb error, [], null
		null

	getProjectSettings = (cb) ->
		requestUrl =  Urls.settings

		request requestUrl, 'GET', {}, ((res) ->
			cb null, res
		), (error) ->
			cb error, [], null
		null

	getVerilogFiles = (cb) ->
		getProjectTree 'verilog', cb

	getNetlistFiles = (cb) ->
		getProjectTree 'netlist', cb

	getTestbenchFiles = (cb) ->
		getProjectTree 'testbench', cb

	getPCFFiles = (cb) ->
		getProjectTree 'pcf', cb

	getSimulationFiles = (cb) ->
		getProjectTree 'vcd', cb

	getIconFiles = (cb) ->
		getProjectTree 'icon', cb

	getStandardCells = (cb) ->
		request Urls.retrieve.stdcell, 'GET', {}, ((res) ->
			cells = []
			for cell in res.stdcell
				cells.push
					id: cell
					text: cell
			cb null, cells
		), (error) ->
			cb error, []
		null

	getIPs = (cb) ->
		request Urls.retrieve.ips, 'GET', {}, ((res) ->
			cb null, res.ips
		), (error) ->
			cb error, []
		null
	getBoardsInfo = (cb) ->
		request Urls.retrieve.boards, 'GET', {}, ((res) ->
			cb null, res.boards
		), (error) ->
			cb error, []
		null

	resizeHanlder = (e) =>
		threhWidth = toolbar.width() + menubar.width() + exitButton.width() + 50
		if window.innerWidth < threhWidth
			toolbar.hide()
			exitButton.hide()
		else
			toolbar.show()
			exitButton.show()

	configureSockets = ->
		socket = io('/')

		retryId = undefined
		retryCount = 1

		retryConnect = ->
			if !socket.connected
				socket.io.disconnect()
				socket.connect()
				socket.on 'connect', onSocketConnect
				socket.on 'reconnect', onSocketConnect
				socket.on 'event', onSocketEvent
				socket.on 'notification', onSocketNotification
				socket.on 'disconnect', onSocketDisconnect
			else
				clearInterval retryId
				retryId = null
				retryCount = 1
			retryCount++
			return

		onSocketConnect = ->
			$('#connection-status').attr('class', 'connection-status connection-status-connected').attr 'title', 'Connected'
			###if retryId? or socket.connected
				clearInterval retryId
				retryId = null
				retryCount = 1###

		onSocketDisconnect = ->
			$('#connection-status').attr('class', 'connection-status connection-status-disconnected').attr 'title', 'Disconnected'
			###unless retryId?
				retryId = setInterval(retryConnect, Math.min(5000, retryCount * 1000))###

		onSocketEvent = (data) ->
			alert 'Event'
			console.log data

		onSocketNotification = (data) ->
			alert 'Notification'
			console.log data


		socket.on 'connect', onSocketConnect
		socket.on 'event', onSocketEvent
		socket.on 'notification', onSocketNotification
		socket.on 'disconnect', onSocketDisconnect

	setupMenubar = ->
		menuData = [
			{
				title: 'CloudV',
				image: '/images/logo/xxxs.png',
				imageClass: 'ws-logo'
			},
			{
				title: 'File',
				submenu:[
					{
						title: 'New',
						submenu: [
							{
								title: 'Verilog Module',
								onclick: newVerilog.bind @, null, null
							},
							{
								title: 'Verilog Testbench',
								onclick: newTestbench.bind @, null, null
							},
							{
								title: 'Finite State Machine (WIP)',
								onclick: newFSM.bind @, null, null
							}
							{
								title: 'Plain Text Document',
								onclick: newText.bind @, null, null
							}
							{
								title: 'IP Core',
								onclick: newIP.bind @, null, null
							}
							{
								title: 'Pin Constraints File',
								onclick: newPCF.bind @, null, null
							}
							{
								title: 'System Model File (WIP)',
								onclick: newSYS.bind @, null, null
							}
							{
								title: 'System-on-Chip (WIP)',
								onclick: newSOC.bind @, null, null
							}
							# {
							# 	title: 'C++ Source File (CPP) (WIP)',
							# 	onclick: newCPP.bind @, null, null
							# }
							# {
							# 	title: 'C++ Header File (HPP) (WIP)',
							# 	onclick: newHPP.bind @, null, null
							# }
						]
					},
					{
						title: 'New Folder',
						onclick: newFolder.bind @, null, null
					},
					{
						title: 'Save',
						onclick: saveOpenTab.bind @, null, null
					},
					{
						title: 'Search',
						onclick: searchFile.bind @, null, null
					},
					{
						title: 'seperator'
					},
					{
						title: 'Exit Workspace',
						onclick: exitWorkspace.bind @, null, null
					}
				]

			},
			{
				title: 'Edit',
				submenu: [
					{
						title: 'Refresh',
						onclick: refreshTree.bind @, null, null
					},
					{
						title: 'seperator'
					},
					{
						title: 'Copy',
						onclick: copyFile.bind @, null, null
					},
					{
						title: 'Cut',
						onclick: cutFile.bind @, null, null
					},
					{
						title: 'Paste',
						onclick: pasteFile.bind @, null, null
					},
					{
						title: 'Rename',
						onclick: renameFile.bind @, null, null
					},
					{
						title: 'Delete',
						onclick: deleteFile.bind @, null, null
					},
					{
						title: 'seperator'
					},
					{
						title: 'Duplicate',
						onclick: duplicateFile.bind @, null, null
					},
					{
						title: 'Download File',
						onclick: downloadFile.bind @, null, null
					}
					{
						title: 'seperator'
					},
					{
						title: 'Undo',
						onclick: undoAction.bind @, null, null
					},
					{
						title: 'Redo',
						onclick: redoAction.bind @, null, null
					}
					{
						title: 'Select All',
						onclick: selectAll.bind @, null, null
					}
					{
						title: 'Find',
						onclick: findAction.bind @, null, null
					}
					{
						title: 'Find and Replace',
						onclick: replaceAction.bind @, null, null
					}
				]
			},
			{
				title: 'Project',
				submenu: [
					{
						title: 'Validate Project',
						onclick: buildProject.bind @, null, null
					},
					{
						title: 'Synthesize',
						onclick: synthesize.bind @, null, null
					},
					{
						title: 'Simulate',
						onclick: simulate.bind @, null, null
					},
					{
						title: 'Generate Bitstream (WIP)',
						onclick: generateBitstream.bind @, null, null
					},
					{
						title: 'Compile Software Files (WIP)',
						onclick: compileSW.bind @, null, null
					},
					{
						title: 'Workspace Settings',
						onclick: workspaceSettings.bind @, null, null
					},
				]
			},
			{
				title: 'Post-synthesis',
				submenu: [
					{
						title: 'Static Timing Analysis',
						onclick: staAnalysis.bind @, null, null
					},
					{
						title: 'Synthesis Report',
						onclick: synthesisReport.bind @, null, null
					}
				]
			},
			{
				title: 'Help',
				submenu: [
					{
						title: 'About',
						onclick: about.bind @, null, null
					},
					{
						title: 'Knowledgebase',
						onclick: help.bind @, null, null
					}
					{
						title: 'Report a Bug',
						onclick: bugReport.bind @, null, null
					}
				]
			},
			{
				title: 'vertical-seperator'
			},
			{
				title: 'Validate',
				id: 'cmd-validate',
				icon: 'fa fa-check-circle-o',
				command: buildProject.bind @, null, null
			},
			{
				title: 'Synthesize',
				id: 'cmd-synthesize',
				icon: 'fa fa-microchip',
				command: synthesize.bind @, null, null
			},
			{
				title: 'Simulate',
				id: 'cmd-simulate',
				icon: 'fa fa-line-chart',
				command: simulate.bind @, null, null
			}
		]

		menu = new Menubar '#menu', menuData, yes
		$('.menubar').mouseenter refreshMenus

	tabManager = undefined
	tabEl = undefined
	logTabManager = undefined
	logTabEl = undefined
	toggleTabTheme = ->
		if tabEl.classList.contains('chrome-tabs-dark-theme')
			document.documentElement.classList.remove('dark-theme')
			tabEl.classList.remove('chrome-tabs-dark-theme')
		else
			document.documentElement.classList.add('dark-theme')
			tabEl.classList.add('chrome-tabs-dark-theme')
	tabChangeHandler = (tabId) ->
		$('.editor-tab-content').hide()
		tabContentId = "#{tabId}-content"
		$("##{tabContentId}").show()
		fileId = $("##{tabId}").data 'fileId'
		selectNode fileId if fileId
		editor = getActiveEditor()
		if editor
			editor.resize()
			editor.focus()

	setupTabs = ->
		$(document).ready (e)->
			tabEl = document.querySelector('#editor-tabs-inner')
			tabManager = new ChromeTabs()
			tabManager.closeHandler = closeTab
			tabManager.init	tabEl,
					tabOverlapDistance: 14,
					minWidth: 45,
					maxWidth: 243,
					pinnedTab: 'new-file-tab fa fa-plus'
			iEl = $('.new-file-tab')
			addButton = $(iEl.parent().parent())
			addButton.contextmenu
				autoTrigger:no
				menu: newMenuChildren
				beforeOpen: (event, ui) ->
					selectedNode = getTopFolderNode()
					nodeType = selectedNode.type

					addButton.contextmenu 'enableEntry', 'newverilog', yes
					addButton.contextmenu 'enableEntry', 'newtestbench', yes
					addButton.contextmenu 'enableEntry', 'newfsm', yes
					addButton.contextmenu 'enableEntry', 'newsoc', yes
					addButton.contextmenu 'enableEntry', 'newsys', yes
					addButton.contextmenu 'enableEntry', 'newtext', yes
					addButton.contextmenu 'enableEntry', 'newip', yes
					addButton.contextmenu 'enableEntry', 'newpcf', yes
					addButton.contextmenu 'enableEntry', 'newcpp', yes
					addButton.contextmenu 'enableEntry', 'newhpp', yes


					unless selectedNode and (nodeType in ['folder', 'root'])
						addButton.contextmenu 'enableEntry', 'newverilog', no
						addButton.contextmenu 'enableEntry', 'newtestbench', no
						addButton.contextmenu 'enableEntry', 'newfsm', no
						addButton.contextmenu 'enableEntry', 'newsoc', no
						addButton.contextmenu 'enableEntry', 'newsys', no
						addButton.contextmenu 'enableEntry', 'newtext', no
						addButton.contextmenu 'enableEntry', 'newip', no
						addButton.contextmenu 'enableEntry', 'newpcf', no
						addButton.contextmenu 'enableEntry', 'newcpp', no
						addButton.contextmenu 'enableEntry', 'newhpp', no



				close: (event) ->

				select: (event, ui) ->
					selectedNode = getSelectedNode()
					if selectedNode?
						contextMenuHandler ui.cmd
			addButton.click (e)->
				addButton.contextmenu "open", $(e.originalEvent)
			$(tabEl).on 'activeTabChange', (e) ->
				targetTab = $(e.originalEvent.detail.tabEl)
				if targetTab.length
					tabId = targetTab.attr 'id'
					if tabId? and tabId.length
						tabChangeHandler tabId
			$(tabEl).on 'tabRemove', (e) ->
				targetTab = $(e.originalEvent.detail.tabEl)
				if targetTab.length
					tabId = targetTab.attr 'id'
					if tabId? and tabId.length
						tabContent = $("##{tabId}-content")
						if tabContent.length
							tabContent.remove()
			$('#tab-content').css 'height', "calc(100% - #{$("#editor-tabs-inner").height() + 4}px)"

			# Configure log tabs:
			logTabEl = document.querySelector('#log-tabs-inner')
			logTabManager = new ChromeTabs()
			logTabManager.closeHandler = ->
			logTabManager.init	logTabEl,
					tabOverlapDistance: 14,
					minWidth: 45,
					maxWidth: 143
			tabOptions =
				title: 'Console'
				closeable: no
			createdTab = $(logTabManager.addTab(tabOptions))
			tabId = "console-tab"
			createdTab.attr 'id', tabId

			tabOptions.title = 'Warnings'
			createdTab = $(logTabManager.addTab(tabOptions))
			tabId = "warnings-tab"
			createdTab.attr 'id', tabId

			tabOptions.title = 'Errors'
			createdTab = $(logTabManager.addTab(tabOptions))
			tabId = "errors-tab"
			createdTab.attr 'id', tabId
			$(logTabEl).on 'activeTabChange', (e) ->
				targetTab = $(e.originalEvent.detail.tabEl)
				if targetTab.length
					tabId = targetTab.attr 'id'
					if tabId? and tabId.length
						$('#console').hide()
						$('#warnings').hide()
						$('#errors').hide()
						if tabId is 'console-tab'
							$('#console').show()
						else if tabId is 'warnings-tab'
							$('#warnings').show()
						else if tabId is 'errors-tab'
							$('#errors').show()
			$(logTabEl).on 'tabRemove', (e) ->
				targetTab = $(e.originalEvent.detail.tabEl)
				if targetTab.length
					tabId = targetTab.attr 'id'
					if tabId? and tabId.length
						tabContent = $("##{tabId}-content")
						if tabContent.length
							tabContent.remove()
			setLogTab 0
			#toggleTabTheme()

	addMenuExternalLink = (el, link) ->
		return if not el or not el.length
		el.attr 'target', '_blank'
		el.attr 'href', link


	setupIDE = ->
		getProjectSettings (err, settings) ->
			if err
				return displayError err
			else
				defaultThemeIndex = settings.theme
				defaultFontSize = settings.fontSize

		refreshTree()
		setupMenubar()
		setupTabs()
		$(window).resize resizeHanlder
		resizeHanlder()
		$(document).unbind('keydown').bind 'keydown', (e) ->
			doPrevent = no
			if e.keyCode is 8
				el = e.srcElement || e.target
				return if (not el?) or typeof el.attr isnt 'function'
				tagName = el.tagName.toLowerCase()
				type = el.attr('type').toLowerCase()
				if tagName is 'input' and (type is 'text' or type is 'password' or type is 'file' or type is 'search' or type is 'email' or type is 'number' or type is 'date') or tagName is 'textarea'
					doPrevent = el.readOnly or el.disabled
				else
					doPrevent = no

			if doPrevent
				e.preventDefault()
		$('.ui-tabs').click (e)->
			unless $(e.target).is 'a'
				editor = getActiveEditor()
				if editor
					editor.reselect = yes
					editor.focus()
		configureSockets()
		onSplitterDrag()
		window.onbeforeunload = (e) ->
			e = e or window.event;
			tabs = getAllTabIds()
			notSavedTabs = []
			tabs.forEach (tabId) ->
				isSaved = $("##{tabId}").data 'saved'
				if isSaved? and not isSaved
					notSavedTabs.push tabId
			if notSavedTabs.length is 0
				return null
			message = 'Are you sure you want to exit the workspace without saving?'
			if e
				e.returnValue = message
			return message

		helpUrl = "#{window.location.protocol}//#{window.location.host}#{Urls.aboutCloudV}"
		addMenuExternalLink $('#menu-knowledgebase>a'), Urls.cloudvHelp

		$(document).ready (e) ->
			$('#loading-screen').remove()

	setupIDE()
