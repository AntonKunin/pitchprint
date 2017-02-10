/*
		PITCHPRINT Client.
		This integrates and manages the PitchPrint app in the following cart frameworks: OpenCart, WordPress, PrestaShop and Shopify
*/
var PPCLIENT = PPCLIENT || { version: '8.3.0', readyFncs: []};

(function(global) {
    'use strict';
	
	if (!jQuery) throw new Error('jQuery required for PitchPrint!');
	
	var $ = jQuery, ppc = global.PPCLIENT;
	/* PPCLIENT.vars is defined and innitialized in the site's page. */
	if (!ppc.vars) ppc.vars = {};
	var vars,
		_btnCustomize, _btnEdit, _btnUpload, _btnDownload, _btnClear, _selDesign, _mainSec, _divInline, _uploadPanel, _btnStartUpload, _btnStopUpload, _uploadStack, _uploadProgress, _uploadProgressAnim,
		_qrySpImage = ".image,#product-photo-container,.product-left-column,.main-image,.product-photo-container,.featured,#image-block,.product-single-photos,.product_slider,#product-image,.photos",
		_qryHideCartBtn = ".single_add_to_cart_button,.kad_add_to_cart,.addtocart,#add-to-cart,.add_to_cart,#add,#AddToCart,#product-add-to-cart,#add_to_cart,#button-cart",
		_qryImages = ".images",
		_qryWpImage = ".product_image,.images",
		_qryThumbs = ".thumbnails,.thumbs,.flex-control-thumbs,.more-view-wrapper,#views_block",
		_qryOcImage = ".thumbnails,.image-container,.product-gallery",
		_qrySpZoom = ".image,.featured,.zoom,product-photo-container",
		_qryCval = "#_w2p_set_option,#web2print_option_value";
	
	
	/* Initializes this script */
	ppc.init = function() {
		if (ppc.vars.initialized || !ppc.vars.apiBase) return;
		vars = ppc.vars;
		ppc.loadStyle();
		vars.isMobile = (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
		
		if (vars.designId === '-1' || vars.designId === '0') vars.designId = '';
		vars.isCategory = vars.designId ? (vars.designId.length ? ((vars.designId[0] === '*') && (vars.mode !== 'edit')) : false) : false;
		if (vars.isCategory) vars.config.showOnStartup = false;
		vars.designStack = { };
		
		vars.inline = vars.config.inlineSelector || '';
		vars.isInline = vars.inline.length && $(vars.inline).length && !vars.isMobile;
		vars.thumbsSrc = vars.client === 'oc' ? 'image/data/files/' : 'images/files/';
		
		ppc.cleanup();
		ppc.createUiButtons();
		
		if (vars.projectId && !isNaN(parseInt(vars.previews))) {
			var arr = [], count = parseInt(vars.previews);
			for (var i = 0; i < count; i++) {
				arr.push(vars.projectId + '_' + (i + 1) + '.jpg');
			}
			ppc.updatePreviews(arr, vars.rscBase + 'images/previews/', false);
			if (ppc.isValidPP(vars.cValues) && vars.mode === 'edit') vars.designId = JSON.parse(decodeURIComponent(vars.cValues)).designId;
		} else if (vars.mode === 'upload' && ppc.isValidPP(vars.cValues)) {
			ppc.updatePreviews(JSON.parse(decodeURIComponent(vars.cValues)).previews, '', false);
		}
		
		ppc.setBtnPref();
		ppc.loadLang();
		vars.initialized = true;
	};
	
	/* Any cleanup ritual is performed here for any of the framework clients */
	ppc.cleanup = function() {
		switch (vars.client) {
			case 'ps':
				$('#customizationForm').parent().hide();
				$('#header .shopping_cart a:first').hover(
					function() {
						if (ajaxCart.nb_total_products > 0 || parseInt($('.ajax_cart_quantity').html()) > 0) {
							$('li[name=customization]').each(function(){
								var _this = $(this);
								if (_this.text().indexOf('%22')) _this.html(_this.children()[0]).append(vars.lang['design']);
							});
						}
					}
				);
			break;
		}
	}
	
	/* In the cart pages, PitchPrint data is purged alongside as a customization text attribute.
	This function strips off the text (which is JSON) and replaces it with buttons to perform design copy and replaces the image with the customized image as well. */
	ppc.sortCart = function() {
		var _this, _val;
		switch (vars.client) {
			case 'wp':
				$('.pp-cart-label').each(function() {
					_this = $(this);
					_val = JSON.parse(decodeURIComponent(_this.prop('id')));
					_this.attr('pp-lang', _val.type === 'p' ? 'design' : 'file_upload')
					if (vars.lang) _this.text(vars.lang[_val.type === 'p' ? 'design' : 'file_upload']);
				});
				$('.pp-cart-data').each(function() {
					_this = $(this);
					_val = JSON.parse(decodeURIComponent(_this.prop('id')));
					if (ppc.isCheckoutPage) {
						_this.parent().append('<img src="' + (_val.previews ? _val.previews[0] : (vars.rscBase + 'images/previews/' + _val['projectId'] + '_1.jpg')) + '" style="width:90px">');
						_this.remove();
					} else {
						if (_val.type === 'p') {
							_this.attr('pp-lang', 'duplicate_design');
							if (vars.lang) _this.text(vars.lang['duplicate_design']);
						} else {
							_this.attr('pp-lang', 'button_label_ok').attr('href', "").css('pointer-events', 'none').removeClass('button');
							if (vars.lang) _this.text(vars.lang['button_label_ok']);
						}
					}
				});
			break;
			case 'oc':
				$("span[pp-value]").each(function() {
					var _this = $(this);
					if (_this.attr('pp-value').trim() !== '') {
						var _value = _this.attr('pp-value').trim(), _img, _thumb, _nParent,
							_val = JSON.parse(decodeURIComponent(_value));
							//TODO: check against isValidPP
						if (_this.attr('pp-image')) {
							_img = _this.attr('pp-image').trim();
							if (_val.type === 'p') {
								$(_this.closest('table').find("img[src='" + _img + "']")[0]).attr('src', vars.rscBase + 'images/previews/' + _val.projectId + '_1.jpg').css('width', '90px');
								_this.parent().html('<span pp-lang="design" >' + (vars.lang ? vars.lang['design'] : '') + '</span>: &nbsp;&nbsp; <a pp-lang="duplicate_design" href="#" id="' + _value + '">' + (vars.lang ? vars.lang['duplicate_design'] : '') + '</a>');
							} else {
								$(_this.closest('table').find("img[src='" + _img + "']")[0]).attr('src', _val.previews[0]).css('width', '90px');
								_this.parent().html('<span pp-lang="file_upload" >' + (vars.lang ? vars.lang['file_upload'] : '') + '</span>: &nbsp;&nbsp; <img style="width:14px; height:14px" src="' + vars.cdnBase + 'images/ok.png" >');
							}
						} else {
							_nParent = _this.parent().html('<span pp-lang="' + (_val.type === 'p' ? 'design' : 'file_upload') + '" >' + (vars.lang ? vars.lang[_val.type === 'p' ? 'design' : 'file_upload'] : '') + '</span>: &nbsp;&nbsp; <img style="width:14px; height:14px" src="' + vars.cdnBase + 'images/ok.png" >');
							_thumb = _val.type === 'p' ? (vars.rscBase + 'images/previews/' + _val.projectId + '_1.jpg') : _val.previews[0];
							_nParent.html('<img style="margin-top:5px; border: 1px #eee solid;" src="' + _thumb + '" width="100" >');
						}
					}
				});
			break;
			case 'ps':
				var _str, _this, _val, _value;
				$('li').each(function() {
					_this = $(this);
					if (_this.html().indexOf('@PP@') > -1 || (_this.html().indexOf('%7B%22') > -1 && _this.html().indexOf('%22%7D') > -1)) {
						_str = '<div>';
						_value = _this.html().split(':').pop().trim();
						_val = decodeURIComponent(_value);
						if (ppc.isValidPP(_val)) {
							_val = JSON.parse(_val);
							if (_val.type === 'p' && _val.numPages) {
								_str += '<div style="padding:5px"><a href="#" id="' + _value + '" pp-lang="duplicate_design">' + (vars.lang ? vars.lang['duplicate_design'] : '') + '</a></div>';
								for (var _i = 0; _i < _val.numPages; _i++) {
									_str += '<a class="ppc-ps-img"><img src="' + vars.rscBase + 'images/previews/' + _val.projectId + '_' + (_i + 1) + '.jpg" class="pp-90thumb" ></a>';
								}
							} else {
								_val.previews.forEach(function(_itm) {
									_str += '<a class="ppc-ps-img"><img src="' + _itm + '" class="pp-90thumb" ></a>';
								});
							}
							_this.html(_str + '</div>');
						}
					}
				});
			break;
		}
		
		/* For all elements with pp-lang="duplicate_design", add a click function and show a spinner and call duplicateProject when clicked */
		$('[pp-lang="duplicate_design"]').click(function(_e) {
			_e.preventDefault();
			var _this = $(this);
			_this.removeClass('button').html('<img src="' + vars.cdnBase + 'images/loaders/spinner.svg" class="ppc-ldr" >');
			ppc.duplicateProject(_this.prop('id'));
		});
	}
	
	/* Validate the apiKey and fetch the corresponding configuration data.
	This is the first function that should be called.
	_fnc - Function to call when complete or call the PPCLIENT.init function */
	ppc.validate = function (_fnc) {
		if (ppc.vars.validationData) return;
		if (!vars) vars = ppc.vars;
		ppc.comm(vars.apiBase + 'validate', function(_data) {
			if (!_data.error) {
				vars.validationData = _data.validation;
				vars.config = _data.config;
				vars.connectsid = _data.validation.server.urlToken;
				localStorage.removeItem('pitchPrintTempSave');
				if (vars.config.customJs) $('<script>' + vars.config.customJs + '</script>').appendTo("head");
				if (vars.config.customCss) $('<style>' + vars.config.customCss + '</style>').appendTo("head");
				if (typeof _fnc === 'function') {
					_fnc();
				} else if (ppc.afterValidation) {
					ppc[ppc.afterValidation]();
				} else { 
					ppc.init();
				}
			} else {
				ppc.alert(_data);
			}
		}, function(_e) { ppc.alert(_e) }, {
			userId: vars.userId,	// Customer's Unique ID
			apiKey: vars.apiKey,	// API Key
			client: vars.client,	// oc (OpenCart), ps (Prestashop), wp (Wordpress), sp (Shopify) mg (Magento)
			version: ppc.version,
			config: true,
			tempProject: localStorage.getItem('pitchPrintTempSave')
		}, 'POST', 'json', true);
	};
	
	/* Load the language file */
	ppc.loadLang = function(_stop) {
		if (!vars) vars = ppc.vars;
		if (vars.langCode) {
			if (vars.langCode.toLowerCase() === 'br') vars.langCode = 'pt-br';
		}
		
		ppc.comm(vars.cdnBase + vars.buildPath + 'lang/' + (vars.langCode || 'en').toLowerCase(), 
			function (_r) {
				vars.lang = ((typeof vars.functions.onLanguageLoaded === 'function') ? vars.functions.onLanguageLoaded(_r) : _r);
				if (ppc.langEdits) {
					for (var _k in ppc.langEdits) { vars.lang[_k] = ppc.langEdits[_k]; }
				}
				ppc.syncLang();
				if (!_stop) ppc.initEditor();
			},
			function (_e) { throw new Error('Error loading language file') }, null, "GET", "json"
		);
	};
	
	/* Utility ajax call function */
	ppc.comm = function(_url, _success, _error, _data, _method, _dType, _cred) {
		$.ajax( {
			url: _url,
			data: _data,
			type: _method || 'POST',
			dataType: _dType || 'json',
			success: _success,
			error: _error,
			xhrFields: { withCredentials: _cred }
		} );
	}
	
	/* Sync the language object (vars.lang) with the UI. */
	ppc.syncLang = function() {
		$("[pp-lang]").each(function() {
			if (this.tagName.toUpperCase() == 'INPUT') {
				$(this).prop('value', vars.lang[$(this).attr('pp-lang')]);
			} else {
				$(this).text(vars.lang[$(this).attr('pp-lang')]);
			}
		});
	};
	
	/* Initialize the editor and assign it to PPCLIENT.designer */
	ppc.initEditor = function () {
		if (!vars.apiKey || !vars.designId) return;
		
		ppc.designer = new pprint.designer( {
			apiKey: vars.apiKey,
			apiBase: vars.apiBase,
			cdnBase: vars.cdnBase,
			rscBase: vars.rscBase,
			buildPath: vars.buildPath,
			parentDiv: vars.isInline ? '#pp_inline_div' : undefined,
			mode: vars.mode,
			lang: vars.lang,
			userId: vars.userId,
			product: vars.product,
			autoSave: vars.autoSave,
			design: vars.design,
			designMode: false,
			designId: vars.isCategory ? undefined : vars.designId,
			designCat: vars.isCategory ? vars.designId : undefined,
			projectId: vars.projectId,
			autoInitialize: !vars.isCategory,
			isUserproject: false,
			isAdmin: false,
			langCode: vars.langCode,
			client: vars.client,
			userData: vars.userData,
			isMobile: vars.isMobile,
			validationData: vars.validationData,
			config: vars.config,
			overrides: ppc.overrides,
			autoShow: vars.mode === 'edit' ? false : vars.config.showOnStartup
		});
		
		//Binding to designer's event bus..
		ppc.designer.events.on('app-shown', ppc.onShown);
		ppc.designer.events.on('app-closed', ppc.onClose);
		ppc.designer.events.on('project-saved', ppc.onSave);
		ppc.designer.events.on('lib-ready', ppc.onLibReady);
		ppc.vars.validationData ? ppc.onValidated() : ppc.designer.events.on('app-validated', ppc.onValidated);
		
		ppc.designer.events.on('app-client-pageCount', ppc.pageCountChanged);
		ppc.designer.events.on('app-client-templateChange', ppc.templateChanged);
		ppc.designer.events.on('app-client-canvasResized', ppc.canvasResized);
		
		if (typeof global.ppDesignerInitialized === 'function') global.ppDesignerInitialized(ppc.designer);
	};
	
	ppc.onClose = function () {
		vars.editorVisible = false;
		if (typeof vars.functions.onClose === 'function') return vars.functions.onClose();
		if (vars.mode === 'new') {
			_btnCustomize.show();
		} else {
			_btnEdit.show();
			if (vars.pdfDownload && _btnDownload.length) _btnDownload.show();
		}
		(vars.enableUpload ? _btnUpload.show() : _btnUpload.hide());
	};
	
	/* Called when the designer has been displayed on the browser */
	ppc.onShown = function() {
		vars.editorShown = vars.editorVisible = true;
		if (typeof vars.functions.onShown === 'function') return vars.functions.onShown();		//Deprecation in view
		_btnCustomize.hide();
		_btnEdit.hide();
		_btnUpload.hide();
		if (_btnDownload) _btnDownload.hide();
	}
	
	/* Called when the project is saved */
	ppc.onSave = function(_e) {
		var _val = _e.data;
		if (typeof vars.functions.onSave === 'function') return vars.functions.onSave(_val);		//Deprecation in view
		vars.mode = 'edit';
		vars.projectSource = _val.source;
		vars.projectId = _val.projectId;
		vars.numPages = _val.numPages;
		vars.previews = _val.previews;
		vars.pdfDownload = _val.pdfDownload;
		vars.isCategory = false;
		
		if (_val.meta.records) $("[name='quantity'],[name='qty']").val(_val.meta.records).change().focus();
		if (_val.meta.ppCanvasAdjustment) ppc.onCaUpdate(_val.meta.ppCanvasAdjustment);
			
		
		var cValue = encodeURIComponent(JSON.stringify ( {
			projectId: _val.projectId,
			numPages: _val.numPages,
			meta: _val.meta,
			userId: vars.userId,
			product: vars.product,
			type: 'p',
			designTitle: _val.source.title,
			designId: _val.source.designId
		} ) );
    	
		if (vars.client === 'sp' && $("#_pitchprint").length) {
			$("#_pitchprint").val(_val.projectId);
		} else if ($("#_w2p_set_option,#web2print_option_value,#" + vars.ocInputOption).length) {
			$("#_w2p_set_option,#web2print_option_value,#" + vars.ocInputOption).val(cValue);
		}
		ppc.saveSess( { values: cValue } );
		
		setTimeout(function() {
			ppc.updatePreviews(_val.previews, '', false);
			if (vars.isInline && vars.config.retainImages) ppc.collapseEditor();
		}, 2000);
		
		ppc.setBtnPref(true);
		ppc.initPdfDownload();
		if (vars.dontCloseApp) {
			ppc.designer.resume();
		} else {
			ppc.designer.close(vars.isInline);
		}
		
		if (typeof vars.functions.onAfterSave === 'function') vars.functions.onAfterSave(_val);
	}
	
	ppc.templateChanged = function(_e) {
		if (typeof vars.functions.templateChanged === 'function') vars.functions.templateChanged(_e.data);
	}
	
	ppc.pageCountChanged = function(_e) {
		if (typeof vars.functions.pageCountChanged === 'function') vars.functions.pageCountChanged(_e.data);
	}
	
	ppc.canvasResized = function(_e) {
		if (typeof vars.functions.canvasResized === 'function') vars.functions.canvasResized(_e.data);
	}
	
	/* Called when the canvas adjuster plugin has been invalidated */
	ppc.onCaUpdate = function(_val) {
		if (_val.values.length) {
			if (typeof vars.functions.canvasAdjustment === 'function') {
				vars.functions.canvasAdjustment(_val);
			} else {
				if ($('label:contains("ppCanvasAdjustment")').length || $('#ppcanvasadjustment').length) {
					var $caOption = $('#ppcanvasadjustment').length ? 'ppcanvasadjustment' : $('label:contains("ppCanvasAdjustment")').attr('for');
					var $sel = $('#'+$caOption), $val, $upper, $lower, $mid;
					$('#' + $caOption + ' > option').each(function() {
						$val = this.text.split('(')[0].split(' ').join('');
						if (_val.isCustom && $val.indexOf('-') > 0 && $val.split('-').length === 2) {
							$mid = parseFloat(_val.values[0]);
							$lower = parseFloat($val.split('-')[0]);
							$upper = parseFloat($val.split('-')[1]);
							if ($mid >= $lower && $mid <= $upper) $sel.val(this.value).change();
						} else if ($val.indexOf('x') > 0 && $val.split('x').length === 2) {
							if (_val.values[0].toLowerCase() == $val.toLowerCase()) $sel.val(this.value).change();
						}
					});
				}
			}
		}
	}
	
	/* Initialize the PDF Download Button */
	ppc.initPdfDownload = function() {
		vars.pdfDownload = ppc.designer.getPdfDownload();
		if (vars.mode === 'edit' && vars.pdfDownload) {
			ppc.comm(vars.apiBase + 'pdf-download',
				function(_val) {
					_btnDownload.removeAttr('disabled').html(vars.lang['pdf_download'] || 'Download PDF File').attr('href', _val.url);
				},
				function(_e) { ppc.alert(_e); }, { connectsid: vars.connectsid, id: vars.projectId, type: 'pdf' }, 'post', 'json', true
			);
			_btnDownload.show().attr('disabled', 'disabled').html('<img src="' + vars.cdnBase + 'images/loaders/spinner.svg" height="24" >');
		}
	}
	
	/* Called when resources (pictures, background, fonts, text-arts, design and project source) has loaded  */
	ppc.onLibReady = function() {
		if (vars.loadingCatLib) {
			$.unblockUI();
			vars.loadingCatLib = false;
			ppc.onReady();
		}
	}
	
	/* Called when the designer is ready */
	ppc.onReady = function () {
		if (vars.mode !== 'edit') _btnCustomize.removeAttr('disabled').html(vars.lang['custom_design']);
	};
	
	/* Load the client.css file */
	ppc.loadStyle = function() {
		var _styleLink = document.createElement("link");
		_styleLink.rel = "stylesheet";
		_styleLink.href = vars.cdnBase + vars.buildPath + 'styles/client.css';
		document.head.appendChild(_styleLink);
	}
	
	/* Create the buttons... Customize Now, Start Over, Upload your files etc buttons. */
	ppc.createUiButtons = function() {
		if (vars.client === 'ps') $("#add_to_cart,.product-add-to-cart").parent().prepend('<div class="ppc-main-btn-sec" id="pp_main_btn_sec"></div>');
		if (vars.client === 'sp') $('#pp_main_btn_sec').html('');
		var _ce = (vars.client === 'sp') ? 'a' : 'button';
		
		if (vars.client === 'oc') {
			vars.ocInputOption = 'input-option' + vars.ppOptionId;
			_qryCval += ',#' + vars.ocInputOption;
			var _sel = $('<div id="pp_main_btn_sec" class="form-group required"> <input type="hidden" id="' + vars.ocInputOption + '" name="option[' + vars.ppOptionId + ']" value="' + (vars.cValues || '') + '" />');
			if (vars.ocVersion === 1) {
				if ($('#button-cart').length) {
					$('#button-cart').parent().prepend(_sel);
				} else if ($('.options').length) {
					$('.options').prepend(_sel);
				}
			} else if (!$('#pp_main_btn_sec').length && ($('#product').length || $('#button-cart').length)) {
				if ($('#button-cart').length) {
					$('#button-cart').parent().prepend(_sel);
				}else if ($($('#product').children('h3')[0]).length) {
					_sel.insertAfter($($('#product').children('h3')[0]));
				} else {
					$('#product').prepend(_sel);
				}
			}
		}
		
		_mainSec = $('#pp_main_btn_sec');
		
		if (!_mainSec.length) { ppc.alert('Could not create main button div'); return; }
		
		_selDesign = $('<select class="ppc-main-ui form-control"><option pp-lang="pick_design" value="0"></option></select>').appendTo(_mainSec).change(ppc.setSelectDesign);
		_btnCustomize = $('<'+_ce+' class="ppc-main-ui btn btn-warning btn-block button" pp-lang="custom_design" class="ppc-pointer" type="button" ></'+_ce+'>').appendTo(_mainSec).click(ppc.showDesigner);
		_btnEdit = $('<input class="ppc-main-ui btn btn-success btn-block button" pp-lang="edit_design" type="button" />').appendTo(_mainSec).click(ppc.editDesign);
		_btnDownload = $('<a target="_blank" class="ppc-main-ui btn btn-success btn-block button" pp-lang="pdf_download" type="button"></a>').appendTo(_mainSec);
		_btnClear = $('<input class="ppc-main-ui btn btn-default btn-block button" pp-lang="start_over" type="button" />').appendTo(_mainSec).click(ppc.clearDesign);
		_btnUpload = $('<input class="ppc-main-ui btn btn-default btn-block button" pp-lang="upload_files" type="button" />').appendTo(_mainSec).click(ppc.showUpload);
		
		setTimeout (function() { 
			if ($('label:contains("ppCanvasAdjustment")').length) $('label:contains("ppCanvasAdjustment")').parent().hide();
			if ($('#ppcanvasadjustment').length) $('#ppcanvasadjustment').parent().parent().hide();
		}, 1000);
	}
	
	/* Edit design */
	ppc.editDesign = function () {
		if (vars.editorShown) {
			ppc.designer.resume();
		} else {
			ppc.showDesigner();
		}
		ppc.expandEditor();
		_btnEdit.hide();
	};
	
	/* 'Display' the designer */
	ppc.showDesigner = function () {
		if (vars.isInline) {
			if (!vars.config.showOnStartup) ppc.expandEditor();
			setTimeout(function() {
				ppc.designer.show();
			}, 1000);
			_btnCustomize.hide();
		} else {
			ppc.designer.show();
		}
	};
	
	/* For Inline editor display, this function expands the div where the editor will load into */
	ppc.expandEditor = function() {
		if (!_divInline) return;
		if (_divInline.length) {
			TweenLite.to(_divInline, 0.4, { 'height': ($(window).height() - 150), ease: Power2.easeOut } );
			ppc.scrollInline();
		}
	};
	
	/* Scroll the page to the editor top */
	ppc.scrollInline = function() {
		if (vars.isInline && _divInline) {
			$("html, body").animate( { scrollTop: _divInline.offset().top - (vars.ppScrollTop || 10) }, 300);
		}
	};
	
	/* For designId that is a category, we want to load all the designs under that category and display them for the user to select */
	ppc.setSelectDesign = function () {
		if (_selDesign.val() != '0') {
			
			var _val = _selDesign.val(), _designId = vars.designStack[_val].id, iModel = ppc.designer.getModel();
			
			if (!vars.defaultImages && !vars.config.retainImages) vars.defaultImages = $(_qryImages).children().detach();
			ppc.updatePreviews(_val, vars.rscBase + 'images/designs/', true);
			_btnCustomize.show().attr('disabled', 'disabled');
			
			iModel.vals.designId = _designId;
			iModel.vals.mode = 'new';
			if (vars.editorShown) {
				ppc.comm(vars.apiBase + 'fetch-design', 
					function(_dat) {
						if (!_dat.error) {
							ppc.designer.loadDesign(_dat.design);
						} else { ppc.alert(vars.lang['error_loading_design']); }
						$.unblockUI();
					},
					function(_e) {
						ppc.alert(vars.lang['error_loading_design']);
						$.unblockUI();
					}, { connectsid: vars.connectsid, designId: _designId }, 'post', 'json', true
				);
				ppc.showBusy();
			} else if (ppc.designer.setLib() !== true) {
				vars.loadingCatLib = true;
				ppc.showBusy();
			}
		} else {
			if (vars.defaultImages && !vars.config.retainImages) $(_qryImages).empty().append(vars.defaultImages);
			vars.defaultImages = undefined;
			_btnCustomize.hide();
		}
	}
	
	/* Update the page buttons after */
	ppc.setBtnPref = function(_dontClose) {
		if (typeof vars.functions.customSetBtnPref === 'function') return vars.functions.customSetBtnPref();
		(vars.config.customizationRequired && vars.mode == 'new') ? $(_qryHideCartBtn).hide() : $(_qryHideCartBtn).show();

		$('.ppc-main-ui').hide();
		
		if (vars.isInline) {
			switch (vars.client) {
				case 'wp':
					if (!vars.config.retainImages) $('.single-product-main-image').remove();
				break;
			}
			if (!_dontClose) {
				if (!$('#pp_inline_div').length) {
					if ($(vars.inline).length) {
						_divInline = $('<div class="pp-inline-div" id="pp_inline_div"><img class="pp-inline-div-loader" src="' + vars.cdnBase + 'images/loaders/spinner.svg" ></div>').prependTo($(vars.inline).first());
					} else {
						vars.inline = '';
						vars.isInline = false;
					}
				}
				if (vars.config.showOnStartup) {
					TweenLite.to(_divInline, 0.6, { 'height': ($(window).height() - 150), ease: Power2.easeOut, onComplete: function() { ppc.scrollInline(); } } );
				} else {
					_divInline.height(0);
				}
			}
		}
		
		switch (vars.mode) {
			case 'new':
				if (vars.isCategory) {
					_selDesign.show().attr('disabled', 'disabled');
				} else {
					if ((vars.isInline && vars.config.showOnStartup) || !vars.designId) {
						_btnCustomize.hide();
					} else {
						_btnCustomize.show().attr('disabled', 'disabled').html('<img src="' + vars.cdnBase + 'images/loaders/spinner.svg" class="ppc-btn-ldr" >');
					}
				}
				(vars.enableUpload ? _btnUpload.show() : _btnUpload.hide());
			break;
			case 'edit':
				if (vars.projectId) {
					_btnEdit.show();
					_btnClear.show();
				}
			break;
			case 'upload':
				_btnCustomize.hide();
				_btnUpload.show().removeClass('btn-default').addClass('btn-success').attr('pp-lang', 'files_ok');
				_btnClear.show();
			break;
		}
	}
	
	ppc.processCatModules = function (_val, _des) {
		if (_val) {
			var mods = JSON.parse(_val),
				_ret = false,
				dModel = ppc.designer.getModel();
			
			if (!dModel.runtime.sources.extModules) dModel.runtime.sources.extModules = {};
			$.each(mods, function(_idx, _value) {
				dModel.runtime.sources.extModules[_idx] = _value;
				if (_idx === 'ds' || _value.overwriteCatSelector) {
					dModel.vals.designId = _value.default || _des[0].id;
					if (dModel.vals.designId === 'Pick default design' || dModel.vals.designId === '0') dModel.vals.designId = _des[0].id;
					ppc.designer.loadLib();
					_ret = true;
				}
			});
			return _ret;
		}
	};
	
	/* Fetch designs under a category */
	ppc.fetchDesigns = function(_dat) {
		if (!vars.isCategory) return;
		if (_dat) vars.connectsid = _dat.server.connectsid;
		ppc.comm(vars.apiBase + 'fetch-cat-details', 
			function(_val) {
				vars.designStack = { };
				if (!_val.error) {
					_val.designs.forEach (function (_itm) {
						_selDesign.append('<option value="' + _itm.id + '">' + _itm.title + '</option>');
						vars.designStack[_itm.id] = _itm;
					});
					if (ppc.designer) ppc.designer.getModel().vals.designStack = vars.designStack;
					if (!ppc.processCatModules(_val.modules, _val.designs)) {
						_selDesign.removeAttr('disabled').change();
					} else {
						_selDesign.change().hide();
						if (!vars.config.showOnStartup) _btnCustomize.show();
					}
				}
			},
			function(_e) {
				ppc.alert(_e);
			}, { categoryId: vars.designId.substr(1), connectsid: vars.connectsid }, "post", "json", true
		);
	};
	
	/* Called when validation data is processed inside the app */
	ppc.onValidated = function() {
		if (vars.mode !== 'edit' && _btnCustomize) _btnCustomize.removeAttr('disabled').html(vars.lang['custom_design']);
		ppc.fetchDesigns();
	}
	
	/* Show the upload form */
	ppc.showUpload = function() {
		if (!_uploadPanel) ppc.createUpload();
		vars.idx = 0;
		vars.uploadStack = [];
		vars.uploadArr = [];
		_uploadStack.empty();
		ppc.showModal(_uploadPanel);
		ppc.checkUploads();
	}
	
	/* Create the upload UI */
	ppc.createUpload = function() {
		_uploadPanel = $('<div class="ppc-upload-panel"><div class="ppc-upload-title"><span>' + vars.lang['upload_your_files'] + '</span></div><div class="ppc-upload-top-btn" ><span>' + vars.lang['add_files'] + '</span> <input class="ppc-upload-input" id="ppc-upload-input" type="file" name="files[]" multiple=""></div><div class="ppc-upload-stack" id="ppc-upload-stack"></div> <div><input type="button" id="ppc-start-upload-btn" value="&#10003; ' + vars.lang['submit_tip'] + '" /> &nbsp;&nbsp; <input type="button" id="ppc-stop-upload-btn" value="&#x02717; ' + vars.lang['button_label_cancel'] + '" /></div>').appendTo($('body')).hide();
		_btnStartUpload = $('#ppc-start-upload-btn').click(ppc.plsUpload);
		_btnStopUpload = $('#ppc-stop-upload-btn').click(ppc.cancelUpload);
		_uploadStack = $('#ppc-upload-stack');
		
		var _rBtn = $('<img src="' + vars.rscBase + 'images/cross.png" class="ppc-upload-remove" >')
			.click(function () {
				var data = $(this).data();
				data.context.remove();
				data.abort();
				vars.uploadArr[data.idx] = null;
				data = null;
				ppc.checkUploads();
			});

		$("#ppc-upload-input").fileupload( {
			url: vars.uploadUrl,
			dataType: 'json',
			autoUpload: false,
			dropZone: _uploadStack,
			pasteZone: null,
			singleFileUploads: true,
			sequentialUploads: true,
			maxFileSize: 50000000,
			disableImageResize: /Android(?!.*Chrome)|Opera/.test(window.navigator.userAgent),
			previewMaxWidth: 175,
			previewMaxHeight: 175,
			previewCrop: true,
			formData: { convert: true },
		}).on('fileuploadadd', function (e, data) {
			data.context = $('<div class="ppc-upload-thumb-div" ><div class="ppc-upload-thumb">' + data.files[0].name + '</div></div>').prependTo(_uploadStack);
		}).on('fileuploadprocessalways', function (_e, _data) {
			var _file = _data.files[_data.index], _node = $(_data.context);
			if (_data.files.error) {
				$(_data.context).remove();
			} else {
				if (_file.preview) {
					_node.prepend(_file.preview);
				} else {
					_node.prepend($('<img src="' + (vars.pluginRoot || '') + vars.thumbsSrc + _file.name.split('.').pop().toLowerCase() + '.png" class="ppc-upload-thumb-img" />'));
				}
				_data.idx = vars.idx;
				$(_data.context).append(_rBtn.clone(true).data(_data));
				vars.uploadArr.push(_data);
				vars.idx++;
				ppc.checkUploads();
			}
		}).on('fileuploaddone', function (_e, _data) {
			$.each(_data.result.files, function (_index, _file) {
				if (_file.url) {
					vars.uploadStack.push(_file);
					if (vars.uploadArr.length > 0) {
						ppc.plsUpload();
					} else {
						$.unblockUI();
						_finishedUploading();
					}
				} else if (_file.error) {
					ppc.alert(vars.lang['upload_error']);
					$.unblockUI();
				}
			});
		}).on('fileuploadprogressall', function (_e, _data) {
			_uploadProgressAnim.circleProgress('value', _data.loaded / _data.total);
		}).on('fileuploadfail', function (e, data) {
			ppc.alert(vars.lang['upload_error']);
			$.unblockUI();
		});
		
		_uploadStack.on('dragleave', function(_e) {
			$(_e.target).css('background-color', '#ddd');
		}).on('dragenter', function(_e) {
			$(_e.target).css('background-color', '#BFBFBF');
		}).on('drop', function(_e) {
			$(_e.target).css('background-color', '#ddd');
		});
		
		//================================================
		function _finishedUploading () {
			var _prevs = [], _imgs = [], _val, _projectId, _cValue;
			vars.uploadStack.forEach(function(_itm) {
				if (!_itm.thumbnailUrl) {
					_itm.thumbnailUrl = (vars.pluginRoot || '') + vars.thumbsSrc + _itm.url.split('.').pop().toLowerCase() + '.png';
				}
				_prevs.push(_itm.thumbnailUrl);
				_imgs.push(_itm.url);
			});
			
			vars.mode = 'upload';
			
			if (vars.client === 'sp') _projectId = 'u_' + vars.uniqueId;

			_cValue = encodeURIComponent(JSON.stringify( { 
				projectId: _projectId,
				files: _imgs,
				previews: _prevs,
				meta: {},
				userId: vars.userId,
				product: vars.product,
				type: 'u' 
			} ) );
			
			if (vars.client === 'sp' && $("#_pitchprint").length) {
				$("#_pitchprint").val(_projectId);
			} else if ($(_qryCval).length) {
				$(_qryCval).val(_cValue);
			}
			
			ppc.saveSess( { values: _cValue, isUpload: true, projectId: _projectId,  productId: vars.product.id } );
			ppc.updatePreviews(_prevs, '', false);
			ppc.setBtnPref(true);

		}
		//====================================================
		
		if (vars.client === 'sp' && !vars.uniqueId) {
			ppc.comm(vars.randUrl, function(_r) {
				vars.uniqueId = _r.key;
			}, null, null, 'GET');
		}
		
		_uploadPanel = _uploadPanel.detach();
	}
	
	ppc.cancelUpload = function() {
		ppc.hideUpload();
	}
	
	ppc.hideUpload = function() {
		_uploadPanel = _uploadPanel.detach();
		$.unblockUI();
	}
	
	ppc.plsUpload = function (_e) {
		if (_e) {
			if (vars.editorVisible) {
				/* TODO: If designer visible
				$("#upldpopup").css('opacity', 0).appendTo(W2P.MODEL.runtime.ui.pack);
				W2P.MODEL.runtime.ui.pack.unblock();
				ppc.designer.showModal('Uploading your Files..');*/
			} else {
				ppc.hideUpload();
				ppc.showUploadProgress();
			}
		}
		if (ppc.checkUploads()) {
			var _l = vars.uploadArr.length, _poped;
			for (var _i = 0; _i < _l; _i++) {
				_poped = vars.uploadArr.pop();
				if (_poped) {
					_poped.submit();
					return;
				}
			}
		}
	}
	ppc.showUploadProgress = function() {
		if (!_uploadProgress) {
			_uploadProgress = $('<div class="ppc-upload-progress-parent"><div id="ppc-upload-prgs" class="ppc-upload-progress" ></div>').appendTo($('body'));
			_uploadProgressAnim = $('#ppc-upload-prgs').circleProgress( { value: 0, size: 80, thickness: 10, fill: { color: "#EEEEEE" } });
			_uploadProgress = _uploadProgress.detach();	
		}
		ppc.showModal(_uploadProgress);
	}
	ppc.checkUploads = function() {
		for (var _i = 0; _i < vars.uploadArr.length; _i++) {
			if (vars.uploadArr[_i] !== null) {
				_btnStartUpload.css("opacity", 1).prop('disabled', false);
				return true;
			}
		}
		_btnStartUpload.css("opacity", 0.3).prop('disabled', true);
		return false;
	}
	
	/* Update the Preview images in the page */
	ppc.updatePreviews = function(_val, _prePath, _isRef) {
		if (vars.config.retainImages) return;
		
		var _str, _temp, _design, _i, _rand = Math.random();
		if (_isRef === true) {
			_temp = []; _design = vars.designStack[_val];
			if (!_design) return;
			_val = [];
			for (_i = 0; _i < _design.pages; _i++) _val.push(_design.id + '_' + (_i + 1) + '.jpg');
		}
		
		if (typeof vars.functions.customImageSwap === 'function') return vars.functions.customImageSwap(_val, _prePath);
		
		switch (vars.client) {
			case 'wp':
				if (typeof $().magnificPopup === 'function') {
					_str = '<a href="' + _prePath + _val[0] + '" itemprop="image" class="woocommerce-main-image zoom" title="' + vars.product.name + '" rel="lightbox"><img src="' + _prePath + _val[0] + '" class="attachment-shop_single wp-post-image ppc-img-width" title="' + vars.product.name + '"></a>';
					$(_qryWpImage).last().html(_str);
					
					_str = '';
					_val.forEach(function(_itm, _i) {
						if (_i > 0) _str += '<a href="' + _prePath + _itm + '?rand=' + _rand + '" class="zoom first" title="' + vars.product.name + '" rel="lightbox"><img class="ppc-preview-thumb" src="' + _prePath + _itm + '?rand=' + _rand + '" class="attachment-shop_thumbnail" title="' + vars.product.name + '"></a>';
					});
					$(_qryThumbs).html(_str);
					
					$("a[rel^='lightbox']").magnificPopup( { type: 'image', gallery: { enabled: true } } );
					$('.kad-light-gallery').each(function() {
						$(this).find('a[rel^="lightbox"]').magnificPopup( {
							type: 'image',
							gallery: { enabled: true },
							image: { titleSrc: 'title' }
						});
					});
				} else {
					_str = '<a href="' + _prePath + _val[0] + '?rand=' + _rand + '" itemprop="image" class="woocommerce-main-image zoom" title="' + vars.product.name + '" rel="prettyPhoto[product-gallery]"><img src="' + _prePath + _val[0] + '?rand=' + _rand + '" class="attachment-shop_single wp-post-image ppc-img-width" title="' + vars.product.name + '"></a>';
					
					_val.forEach(function(_itm, _i) {
						_str += ' <div class="thumbnails"><a href="' + _prePath + _itm + '?rand=' + _rand + '" class="zoom first" title="' + vars.product.name + '" rel="prettyPhoto[product-gallery]"><img width="150" height="90" src="' + _prePath + _itm + '?rand=' + _rand + '" class="attachment-shop_thumbnail" title="' + vars.product.name + '"></a></div>';
					});
					
					$(_qryWpImage).html(_str);
					if ($.prettyPhoto !== undefined) $("a[rel='prettyPhoto[product-gallery]']").prettyPhoto();
				}
			break;
			case 'oc':
				if ($(_qryOcImage).length && $.magnificPopup) {      //for opencart v.2 default colorbox...
					_str = '<li><a class="thumbnail product-image" rel="magnific" href="' + _prePath + _val[0] + '" title="' + vars.product.name + '"><img src="' + _prePath + _val[0] + '?r=' + _rand + '" ></a></li>';
					_val.forEach(function(_itm, _i) {
						if (_i > 0) _str += ' <li class="image-additional image-thumb"><a rel="magnific" class="thumbnail" href="' + _prePath + _itm + '?r=' + _rand + '" > <img src="' + _prePath + _itm + '?r=' + _rand + '" ></a></li>';
					});                        
					$(_qryOcImage).html(_str);
					$('a[rel="magnific"]').magnificPopup( { type: 'image', gallery: { enabled: true } } );
					
				} else if ($(".image").length && $.colorbox) {
					$(".image").html('<a href="' + _prePath + _val[0] + '?r=' + _rand + '" title="' + vars.product.name + '" class="colorbox cboxElement"><img width="' + ($(".image").width() || 300) + '" src="' + _prePath + _val[0] + '?r=' + _rand + '" title="" alt="" id="image"></a>');
					_str = '';
					_val.forEach(function(_itm, _i) {
						if (_i > 0) _str += ' <a href="' + _prePath + _itm + '?r=' + _rand + '" title="" class="colorbox cboxElement"><img width="76" src="' + _prePath + _itm + '?r=' + _rand + '" title="" alt=""></a>';
					});
					$(".image-additional").html(_str);
					$('.zoomContainer').remove();
					$(".colorbox").colorbox( { rel: 'colorbox' } );
				}
			break;
			case 'ps':
				if ($.fancybox) {
					setTimeout(function () {
						$(document).unbind('click.fb-start');
						$('.fancybox').unbind('click.fb');
						$('.fancybox_').unbind('click.fb');

						$('#image-block,#image-block').html('<a rel="fb__" class="fancybox_" href="' + (_prePath + _val[0]) + '"><img id="bigpic" itemprop="image" src="' + (_prePath + _val[0]) + '" width="458"></a>');
						$('#thumbs_list,#views_block').html('').append('<ul id="thumbs__" style="width: 297px;"></ul>');
						
						for (var _i = 1; _i < _val.length; _i++) {
							$('#thumbs__').append('<li><a rel="fb__" href="' + (_prePath + _val[_i]) + '" class="fancybox_"><img itemprop="image" src="' + (_prePath + _val[_i]) + '" width="80"></a></li>');
						}
						$('#thumbs_list').parent().removeClass('hidden');
						$('.fancybox_').fancybox();
						$('.resetimg,.view_scroll_spacer').hide();
					}, 2000);
				}
			break;
			case 'sp':
				setTimeout(function () {
					$(document).unbind('click.fb-start');
					$(_qrySpZoom).unbind('click.fb').unbind('click');
					
					$(_qrySpImage).first().html('<a rel="_imgs" id="placeholder" href="' + _prePath + _val[0] + '" class="fancybox_ zoom colorbox cboxElement"><img itemprop="image" src="' + _prePath + _val[0] + '" class="ppc-img-width" ></a>');
					
					_str = '';
					_val.forEach(function(_itm, _i) {
						if (_i > 0) _str += '<div rel="_imgs" class="fancybox_ image span2 colorbox cboxElement"><a href="' + _prePath + _itm + '" data-original-image="' + _prePath + _str + '"><img src="' + _prePath + _str + '" alt="' + vars.product.name + '"></a></div>';
					});
					$(_qryThumbs).append(_str);
					
					if (typeof $.fancybox !== 'undefined') {
						$('.fancybox_').fancybox();
					} else if (typeof $.colorbox !== 'undefined') {
						$(".colorbox").colorbox( { rel: '_imgs' } );
					}
				}, 2000);
			break;
			case 'mg':
				//TODO..
			break;
		}
	}
	
	/* Clear customer's design  */
	ppc.clearDesign = function() {
		_btnClear.attr('disabled', 'disabled');
		_btnCustomize.attr('disabled', 'disabled');
		ppc.saveSess( { clear: true } );
	};
	
	/* Save the design in session */
	ppc.saveSess = function (_val) {
		if (vars.client === 'ps') _val.ajax = true;
		if (vars.client === 'sp') {
			_val.productId = vars.product.id;
			_val.connectsid = vars.connectsid;
		}
		ppc.comm(ppc.getSavePath(vars.product.id), function(_msg) {
				if (_val.clear || vars.client === 'ps') window.location.reload();
			}, function(_e) {
				//ppc.alert(_e);
			}, _val, "POST", (_val.clear ? "text" : "json"), (vars.client === 'sp')
		);
	};
	
	/* Duplicate a design project and place it in session for further editing */
	ppc.duplicateProject = function (_val) {
		if (!isNaN(parseInt(_val))) {
			var _prj = vars.designs[parseInt(_val)];
			_val = { 
				projectId: _prj.id,
				numPages: _prj.pages,
				meta: { },
				userId: vars.userId,
				product: _prj.product,
				designId: _prj.designId,
				type: 'p'
			};
		} else {
			_val = JSON.parse(decodeURIComponent(_val));
		}
		var productId = _val.product.id;
		
		ppc.comm(vars.apiBase + 'clone-project', function(_data) {
			if (!_data.error) {
				_val.projectId = _data.newId;
				ppc.comm(ppc.getSavePath(productId, _val), function(__data) { window.location = __data.trim().replace(/&amp;/g, '&'); }, function(__e) { ppc.alert(__e) }, { clone: true, values: encodeURIComponent(JSON.stringify(_val)), ajax: true }, 'POST', 'text');
			} else {
				ppc.alert(new Error('Error duplicating project!'));
			}
		}, function(_e) { ppc.alert(_e) }, { values: 1, projectId: (_val.projectId || _val.projectID), connectsid: vars.connectsid }, 'POST', 'json', true);
		
		var _rec = $('#my_recent_des_div');
		if (_rec.length) {
			_rec.children().hide();
			_rec.prepend('<img src="' + vars.cdnBase + 'images/loaders/spinner.svg" >');
		}
		return false;
	};
	
	/* Get the URL for saving projects on each Framework */
	ppc.getSavePath = function (_id, _val) {
		switch (vars.client) {
			case 'wp':
				return vars.pluginRoot + 'app/saveproject.php?productId=' + _id;
			break;
			case 'oc':
				return (vars.self || ('index.php?route=product/product&product_id=' + _id)) + '&productId=' + _id;
			break;
			case 'ps':
				return _val ? _val.product.url : window.location;
			break;
			case 'sp':
				return vars.apiBase + 'sp-save-session';
			break;
			case 'mg':
				
			break;
		}
	};
	
	/* View the design images in photo-gallery mode */
	ppc.viewDesign = function (_idx) {
		if (!vars.designs) return;
		if (vars.designs[_idx]) {
			var $api_images = [], $api_titles = [], $api_descriptions = [];
			for (var $i=0; $i < vars.designs[_idx].pages; $i++) {
				$api_images.push(vars.rscBase + 'images/previews/' + vars.designs[_idx].id + '_' + ( $i + 1 ) + '.jpg');
			}
			if ($.prettyPhoto) {
				$.prettyPhoto.open($api_images);
			} else if ($.magnificPopup) {
				$api_images.forEach (function (_itm, _idx) {
					$api_images[_idx] = { src:_itm };
				});
				$.magnificPopup.open( { items:$api_images, type:'image', gallery:{enabled:true} } );
			} else if ($.colorbox) {
				$('body').append('<div id="pp_cb_div" style="display:none"></div>');
				$api_images.forEach (function (_itm) {
					$('#pp_cb_div').append('<a href="' + _itm + '" rel="pp-cb-rel" class="pp-cb-rel" ></a>');
				});
				$('a.pp-cb-rel').colorbox({open:true, rel:'pp-cb-rel', onClosed:function() {
					$('#pp_cb_div').remove();
				}});
			}
		}
		return false;
	};
	
	/* Delete a project */
	ppc.deleteProject = function (_idx) {
		if ( confirm( vars.lang['delete_message'] ) ) {
			$('#my_recent_des_div').html('<img src="' + vars.cdnBase + 'images/loaders/spinner.svg" >');
			ppc.comm(vars.apiBase + 'delete-project', function(_data) {
				ppc.fetchUserProjects();
			}, function(_e) { ppc.alert(_e) }, { projectId:_idx, connectsid: vars.connectsid }, 'POST', 'json', true);
		}
		return false;
	};
	
	/* Fetch all projects created by a unique user */
	ppc.fetchUserProjects = ppc.fetchUserDesigns = function () {
		var _elm = $('#pp_mydesigns_div');
		if (!_elm.length) return;
		
		if (!$('#my_recent_des_div').length) _elm.append('<div><h2 pp-lang="text_my_recent">' + (vars.lang ? vars.lang['text_my_recent'] : '') + '</h2><div id="my_recent_des_div"><img src="' + vars.cdnBase + 'images/loaders/spinner.svg" border="0" ><br/><br/></div></div>');
		
		ppc.comm(vars.apiBase + 'fetch-recent', function(_data) {
			if (typeof vars.functions.myRecentDesigns === 'function') return vars.functions.myRecentDesigns(_data);
			_data.reverse();
			vars.designs = _data;
			var _str = '';
			if (_data.length === 0) {
				_str = vars.lang['sorry_no_project'];
			} else {
				_str += '<table class="shop_table my_account_orders table table-bordered table-hover"><tbody>';
				_data.forEach(function(_itm, _i) {
					_str += '<tr class="order"><td class="pp-cntr"><img src="' + vars.rscBase + 'images/previews/' + _itm.id + '_1.jpg" class="pp-90thumb" ></td><td class="pp-cntr" width="180" title="Modified ' + _itm.lastModified + '">' + (_itm.product.name || _itm.product.title) + '</td><td class="pp-cntr"><a class="button btn btn-success" onclick="return PPCLIENT.duplicateProject(' + _i + ')" href=""><span pp-lang="duplicate_design_for_reorder">' + (vars.lang ? vars.lang['duplicate_design_for_reorder'] : '') + '</a></td><td class="pp-cntr"><a class="button btn btn-default" onclick="return PPCLIENT.viewDesign(' + _i + ')" href=""><img src="' + vars.cdnBase + 'images/' + (vars.icnView || 'eye.png') + '" border="0" ></a></td><td class="pp-cntr"><a class="button btn btn-default" onclick="return PPCLIENT.deleteProject(\'' + _itm.id + '\')" href=""><img src="' + vars.cdnBase + 'images/' + (vars.icnDelete || 'cross.png') + '" border="0" ></a></td></tr>';
				});
				_str += '</tbody></table>';
			}
			$('#my_recent_des_div').html(_str);
		}, function(_e) { ppc.alert(_e) },  { connectsid: vars.connectsid }, 'POST', 'json', true);
	};
	
	/* Utility methods */
	ppc.showBusy = function() {
		ppc.showModal('<div class="ppc-blockui-div" ><img src="' + vars.cdnBase + 'images/loaders/spinner.svg" ></div>');
	};
	ppc.showModal = function(_msg) {
		$.blockUI( {
			message: _msg,
			css: {
				padding:        '0',
				margin:         '0',
				width:          "100%",
				left:           '0',
				right:          '0',
				top:            '0',
				bottom:         '0',
				textAlign:      'center',
				background:     'rgba(0,0,0,0)',
				border:			"none",
				cursor:         'default'
			},
			overlayCSS: { cursor: 'default', opacity: 0.5 },
			baseZ: 9999999
		});
	}
	
	/* Check if a JSON string is a valid PitchPrint project */
	ppc.isValidPP = function(_dat) {
		if (!_dat || _dat === '') return false;
		try {
			var $j = JSON.parse(decodeURIComponent(_dat));
			if ($j.type && $j.product) { return true; } else { return false; }
		} catch (e) { return false; }
		return true;
	};
	
	ppc.alert = function(_msg) {
		console.log('PitchPrint: ' + _msg);
		//TODO: or alert
	}
	
	ppc.start = function() {
		if (!ppc.readyFncs) return;
		ppc.readyFncs.forEach(function(_fnc) {
			ppc[_fnc]();
		});
		ppc.readyFncs = [];
	}
	ppc.start();
	
})(this);