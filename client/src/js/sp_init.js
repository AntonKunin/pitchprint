/*! PitchPrint Copyright 2007-2017, SynergicLaboratories (www.synergiclabs.com) */

var PPCLIENT = window.PPCLIENT; if (typeof PPCLIENT === 'undefined') window.PPCLIENT = PPCLIENT = { version: '8.3.0', readyFncs: [] };

//Set constants..

PPCLIENT.vars = {
	client: 'sp',
	uploadUrl: 'https://pitchprint.net/upload/',
	baseUrl: 'https://pitchprint.net',
	apiBase: 'https://pitchprint.net/api/front/',
	runtimePath: 'https://pitchprint.net/api/runtime/',
	cdnBase: 'https://dta8vnpq1ae34.cloudfront.net/',
	rscBase: 'https://s3.amazonaws.com/pitchprint.rsc/',
	randUrl: 'https://pitchprint.net/api/open/gen-key',
	buildPath: 'app/83/',
	functions: { }
};

(function(global) {
    'use strict';
	
	var vars = PPCLIENT.vars, $ = jQuery,
		_cartBtnSel = '.addtocart,#add-to-cart,.add_to_cart,#add,#AddToCart,#product-add-to-cart,#add_to_cart,#AddToCart-product-template';
	
	if (window.location.pathname.indexOf('/products/') !== -1) {
		
		$('[action="/cart/add"]').first().prepend('<div id="pp_main_btn_sec" ><img src="' + vars.cdnBase + 'images/loaders/spinner.svg" width="24" height="24" ></div>');

		$.ajax({
			type: "POST",
			dataType: "json",
			crossDomain: true,
			url: vars.apiBase + 'sp-product',
			data: { productId: __st.rid, shop: Shopify.shop, connectsid: vars.connectsid },
			success: function(_resp) {
				if ((_resp.designId) || _resp.upload === true) {
					vars.apiKey = Shopify.shop;
					vars.designId = _resp.designId;
					vars.hideCartButton = _resp.required;
					vars.mode = _resp.mode;
					vars.enableUpload = _resp.upload;
					vars.previews = _resp.previews;
					vars.cValues = _resp.currentValues;
					vars.autoShow = false;
					vars.langCode = $('html').attr('lang') || 'en';
					vars.userId = __st.cid || 'guest';
					vars.projectId = _resp.currentValues ? _resp.currentValues.projectId : '';
					vars.inline = '#product';
					vars.product = { id: __st.rid, name: __st.pageurl.split('/').pop().split('-').join(' '), variant: '' };
					if (typeof Shopify.getProduct === 'function') {
						Shopify.getProduct(__st.pageurl.split('/').pop(), function(_v) {
							vars.product.name = _v.title;
						});
					}
					
					fetchPPJS();
					if ($(_cartBtnSel).length) {
						$(_cartBtnSel).parent().prepend('<input id="_pitchprint" name="properties[_pitchprint]" type="hidden" value="' + (vars.cValues ? vars.cValues.projectId : '') + '" >');
					}
					PPCLIENT.readyFncs.push('validate');
					if (typeof PPCLIENT.start !== 'undefined') PPCLIENT.start();
				} else {
					$('#pp_main_btn_sec').remove();
				}
			},
			xhrFields:{
				withCredentials: true
			}
		});
	} else if (window.location.pathname.indexOf('/cart') !== -1) {
		$.ajax({
			type: "GET",
			dataType: "json",
			url: '/cart.js',
			success: sortCartImages
		});
	}
	
	function sortCartImages(_val) {
		if (_val.items) {
			var _stack = [];
			_val.items.forEach(function(_itm, _idx) {
				if (_itm.properties) {
					if (_itm.properties._pitchprint) {
						if (_itm.properties._pitchprint.substr(0, 2) !== 'u_') {
							_stack.push( { id: _itm.properties._pitchprint, idx: _idx } );
						}
					}
				}
			});
			if (_stack.length) swapCartImages(_stack);
		}
	}
	
	function swapCartImages(_stack) {
		var _ids = [];
		_stack.forEach(function(_itm) {
			_ids.push(_itm.id);
		});
		$.ajax({
			type: "POST",
			dataType: "json",
			crossDomain: true,
			url: vars.apiBase + 'sp-project-previews',
			data: { ids: _ids.join(','), connectsid: vars.connectsid },
			success: function(_resp) {
				var _tmp, _qrys = $('.product_image:visible,.cart_image:visible,.product-image:visible,.cpro_item_inner:visible'), _str, _resObj = {};
				if (!_resp.error && _qrys.length) {
					_resp.forEach(function(_r) {
						_resObj[_r._id] = _r.previews;
					});
					_stack.forEach(function(_itm) {
						if (_resObj[_itm.id]) {
							_str = '<div>';
							_resObj[_itm.id].forEach(function(_t) {
								_str += '<img src="' + _t + '" width="94" style="margin: 5px;" ><br/>';
							});
							_str += '</div>';
							if ($(_qrys[_itm.idx]).length) $(_qrys[_itm.idx]).html(_str);
						}
					});
				}
			},
			xhrFields:{
				withCredentials: true
			}
		});
	}
	
	function fetchPPJS () {
		var script = document.createElement("script");
		script.setAttribute("type", "text/javascript");
		
		if (script.readyState){  //IE
			script.onreadystatechange = function() {
				if (script.readyState == "loaded" || script.readyState == "complete") {
					script.onreadystatechange = null;
					fetchPPClient();
				}
			};
		} else {  //Others
			script.onload = function() {
				fetchPPClient();
			};
		}
		script.setAttribute("src", vars.cdnBase + vars.buildPath + 'js/app.js');
		document.getElementsByTagName("head")[0].appendChild(script);
	}
	function fetchPPClient() {
		var script2 = document.createElement("script");
		script2.setAttribute("type", "text/javascript");
		script2.setAttribute("src", vars.cdnBase + vars.buildPath + 'js/client.js');
		document.getElementsByTagName("head")[0].appendChild(script2);
	}
	
})(this);