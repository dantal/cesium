require({
        baseUrl: '../../Source',
        packages: [{
            name: 'dojo',
            location: '../ThirdParty/dojo-release-1.7.2-src/dojo'
        }, {
            name: 'dijit',
            location: '../ThirdParty/dojo-release-1.7.2-src/dijit'
        }, {
            name: 'dojox',
            location: '../ThirdParty/dojo-release-1.7.2-src/dojox'
        }]
    }, [
        'Dojo/CesiumWidget',
        'dojo/parser',
        'dojo/dom-class',
        'dojo/dom-construct',
        'dojo/_base/fx',
        'dojo/_base/window',
        'dojo/_base/xhr',
        'dijit/registry',
        'dijit/form/Button',
        'dijit/form/DropDownButton',
        'dijit/form/ToggleButton',
        'dijit/form/DropDownButton',
        'dijit/form/TextBox',
        'dijit/TooltipDialog',
        'dijit/Menu',
        'dijit/MenuBar',
        'dijit/PopupMenuBarItem',
        'dijit/MenuItem',
        'dijit/layout/BorderContainer',
        'dijit/layout/ContentPane',
        'dijit/layout/TabContainer',
        'dijit/Toolbar',
        'dijit/ToolbarSeparator',
        'dojo/domReady!'],
    function (
            CesiumWidget,
            parser,
            domClass,
            domConstruct,
            fx,
            win,
            xhr,
            registry
    ) {
        "use strict";
        parser.parse();
        window.CesiumWidget = CesiumWidget; // for autocomplete.
        fx.fadeOut({ node: 'loading', onEnd: function () {
            domConstruct.destroy('loading');
        }}).play();

        // NOTE: BlobBuilder will eventually be deprecated and replaced with a direct constructor on Blob itself.
        // https://developer.mozilla.org/en/DOM/Blob
        var BlobBuilder = BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
        var getURL = window.URL || window.webkitURL || window;
        if (typeof BlobBuilder === 'undefined') {
            registry.byId('buttonSaveAs').set('disabled', true);
        }

        var jsEditor, htmlEditor, suggestButton = registry.byId('buttonSuggest');
        var docTimer, docTabs = {}, cesiumContainer = registry.byId('cesiumContainer');
        var docNode = dojo.byId('docPopup'), docMessage = dojo.byId('docPopupMessage');
        var local = { 'docTypes': [],  'headers': "<html><head></head><body>"};
        xhr.get({
            url: '../../Build/Documentation/types.txt',
            handleAs: 'json'
        }).then(function (value) {
            local.docTypes = value;
        });

        xhr.get({
            url: 'bucket.html',
            handleAs: 'text'
        }).then(function (value) {
            var pos = value.indexOf('<body');
            pos = value.indexOf('>', pos);
            local.headers = value.substring(0, pos + 1) + '\n';
        });

        function openDocTab(title, link) {
            if (typeof docTabs[title] === 'undefined') {
                docTabs[title] = new dijit.layout.ContentPane({
                    title: title,
                    focused: true,
                    content: '<iframe class="fullFrame" src="' + link + '"></iframe>',
                    closable: true,
                    onClose: function () {
                        docTabs[this.title] = undefined;
                        // Return true to close the tab.
                        return true;
                    }
                }).placeAt(cesiumContainer);
                // After the iframe loads, re-scroll to selected field.
                docTabs[title].domNode.childNodes[0].onload = function () {
                    this.onload = function () {};
                    this.src = link;
                };
                cesiumContainer.selectChild(docTabs[title]);
            } else {
                // Tab already exists, but maybe not visible.  FireFox needs the tab to
                // be revealed before a re-scroll can happen.  Chrome works either way.
                cesiumContainer.selectChild(docTabs[title]);
                docTabs[title].domNode.childNodes[0].src = link;
            }
        }

        function showDocPopup () {
            var selectedText = jsEditor.getSelection();
            if (selectedText && selectedText in local.docTypes && typeof local.docTypes[selectedText].push === 'function') {
                var member, ele, i, len = local.docTypes[selectedText].length;
                docMessage.innerHTML = '';
                for (i = 0; i < len; ++i) {
                    member = local.docTypes[selectedText][i];
                    ele = document.createElement('a');
                    ele.target = "_blank";
                    ele.textContent = member.replace('.html', '').replace('module-', '').replace('#', '.');
                    ele.href = '../../Build/Documentation/' + member;
                    ele.onclick = function () {
                        openDocTab(this.textContent, this.href);
                        return false;
                    };
                    docMessage.appendChild(ele);
                }
                jsEditor.addWidget(jsEditor.getCursor(true), docNode);
                docNode.style.top = (parseInt(docNode.style.top, 10) - 5) + 'px';
            }
        }

        function onCursorActivity() {
            docNode.style.left = "-999px";
            if (typeof docTimer !== 'undefined') {
                window.clearTimeout(docTimer);
            }
            docTimer = window.setTimeout(showDocPopup, 500);
        }

        var bucketFrame = document.getElementById('bucketFrame'),
            logOutput = document.getElementById('logOutput'),
            bucketPane = registry.byId('bucketPane');

        CodeMirror.commands.runCesium = function() {
            //CodeMirror.cesiumWindow = undefined;
            cesiumContainer.selectChild(bucketPane);
            bucketFrame.contentWindow.location.reload();
        };

        CodeMirror.commands.autocomplete = function(cm) {
            CodeMirror.simpleHint(cm, CodeMirror.cesiumHint);
        };

        jsEditor = CodeMirror.fromTextArea(document.getElementById("code"), {
            mode: "javascript",
            lineNumbers: true,
            matchBrackets: true,
            indentUnit: 4,
            extraKeys: {"Ctrl-Space": "autocomplete", "F9": "runCesium"},
            onCursorActivity: onCursorActivity
        });

        htmlEditor = CodeMirror.fromTextArea(document.getElementById("htmlBody"), {
            mode: "text/html",
            lineNumbers: true,
            matchBrackets: true,
            indentUnit: 4,
            extraKeys: {"F9": "runCesium"},
        });

        function appendConsole(element) {
            logOutput.appendChild(element);
            //registry.byId("appLayout").resize();
            logOutput.parentNode.scrollTop = logOutput.clientHeight + 8 - logOutput.parentNode.clientHeight;
        }

        // The iframe (bucket.html) sends this message on load.
        // This triggers the code to be injected into the iframe.
        window.addEventListener('message', function (e) {
            if (e.data === 'reload') {
                logOutput.innerHTML = "";
                //CodeMirror.cesiumWindow = bucketFrame.contentWindow;
                var bucketDoc = bucketFrame.contentDocument;
                var bodyEle = bucketDoc.createElement('div');
                bodyEle.innerHTML = htmlEditor.getValue();
                bucketDoc.body.appendChild(bodyEle);
                var jsEle = bucketDoc.createElement('script');
                jsEle.type = 'text/javascript';
                jsEle.textContent = jsEditor.getValue();
                bucketDoc.body.appendChild(jsEle);
            } else if (typeof e.data.log !== 'undefined') {
                var ele = document.createElement('span');
                ele.textContent = e.data.log + "\n";
                appendConsole(ele);
            } else if (typeof e.data.error !== 'undefined') {
                var ele = document.createElement('span');
                ele.className = 'consoleError';
                ele.textContent = e.data.error + "\n";
                appendConsole(ele);
            }
        }, true);

        registry.byId('jsContainer').on('show', function () {
            suggestButton.set('disabled', false);
            jsEditor.refresh();
        });

        registry.byId('htmlContainer').on('show', function () {
            suggestButton.set('disabled', true);
            htmlEditor.refresh();
        });

        // Clicking the 'Run' button simply reloads the iframe.
        registry.byId('buttonRun').on('click', function () {
            CodeMirror.commands.runCesium();
        });

        registry.byId('buttonSuggest').on('click', function () {
            CodeMirror.commands.autocomplete(jsEditor);
        });

        registry.byId('buttonSaveAs').on('click', function () {
            var html = local.headers + htmlEditor.getValue() +
                '\n<script id="cesium_sandcastle_script">\n' + jsEditor.getValue() +
                '\n</script>\n</body>\n</html>\n';
            //console.log(html); // just a hack for now

            var bb = new BlobBuilder();
            bb.append(html);
            var blob = bb.getBlob("application/octet-stream");  // was "text/plain;charset=utf-8"
            var blobURL = getURL.createObjectURL(blob);
            console.log(blobURL); // just a hack for now
        });
    });