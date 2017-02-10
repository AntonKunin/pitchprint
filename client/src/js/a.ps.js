/*! PitchPrint Copyright 2007-2016, SynergicLaboratories (www.synergiclabs.com) */

var PPADMIN = PPADMIN || { version: "8.3.0", readyFncs: [] };

(function(global) {
    'use strict';
	
	if (!jQuery) throw new Error('jQuery required for PitchPrint!');
	var $ = jQuery, ppa = global.PPADMIN;
	if (!ppa.vars) ppa.vars = { };
	var vars, pp_sep = '@PP@';
	
	ppa.init = function() {
		vars = ppa.vars;
		var _val;
		
		$('p').each(function() {
			_val = $(this).html().trim();
			if (isValidPP(_val)) {
				parsePP(JSON.parse(decodeURIComponent(_val)), this);
			}
		});
		
		$('strong').each(function() {
			if ($(this).html() === pp_sep) $(this).html('').parent().css( { width: '150px' } );
		});

		function parsePP (_val, _elem) {
			var $str = '';
			if (_val.type === 'u') {
				$str = 'Uploaded Files: &nbsp;&nbsp;&nbsp;';
				_val.files.forEach (function (_itm, _i) {
					$str += '<a target="_blank" href="' + _itm + '" >File ' + (_i+1) +'</a> &nbsp;&nbsp;&nbsp;';
				});
			} else {
				$str = '<div style="display: inline-block; -webkit-inline-box; vertical-align: top; margin-top:10px;">&#8226; <a target="_blank" href="' + vars.adminPath + 'orders/' + _val.projectId + '">Download PDF File</a>';
				$str += '<br/>&#8226; <a target="_blank" href="' + vars.adminPath + 'raster/' + _val.projectId + '" >Download Raster Renderings</a>';
				if (_val.userId !== '' && _val.userId) $str += '<br/>&#8226; <a target="_blank" href="' + vars.adminPath + 'editor/edit-project/?p=' + _val.projectId + '&u=' + _val.userId + '">Load Project and Modify</a></div>';
				var $imgStr = '';
				for (var $i=0; $i < _val.numPages; $i++) {
					$imgStr += '<a rel="fb__" class="fancybox_" href="' + vars.rscBase + 'images/previews/' + _val.projectId + '_' + ($i + 1) + '.jpg" style="margin-right:5px" ><img src="' + vars.rscBase + 'images/previews/' + _val.projectId + '_' + ($i + 1) + '.jpg" class="imgm img-thumbnail" width="100" ></a>';
				}
				$str = $imgStr + $str;
			}
			$(_elem).parent().append($str);
			$(_elem).remove();
		}

		function isValidPP (_dat) {
			try {
				var $j = JSON.parse(decodeURIComponent(_dat));
				if ($j.type && $j.product) {
					return true;
				} else {
					return false;
				}
			} catch (e) {
				return false;
			}
			return true;
		}
	};
	
	ppa.hideHacks = function() {
		if ($('#text_fields').length) {
			vars.indexVal = $("#pp_indexVal").val();
			if ($('#ppa_pick_upload').is(':checked') || $("#ppa_pick").val() !== '0') {
				$('#text_fields').val(1).parent().parent().hide();
				/*vars.lang.forEach(function(_itm) {
					if ($('#label_1_' + vars.indexVal + '_' + _itm.id_lang).length) $('#label_1_' + vars.indexVal + '_' + _itm.id_lang).val(pp_sep);
				});*/
			} else{
				$('#text_fields').val(0).show();
			}
		}
	};
	
	ppa.changeOpts = function() {
		var _str = $("#ppa_pick").val();
		_str += ':' + ($('#ppa_pick_upload').is(':checked') ? 1 : 0);
		if ($("#ppa_pick_hide_cart_btn").length) {
			_str += ':' + ($('#ppa_pick_hide_cart_btn').is(':checked') ? 1 : 0);
		}
		$("#ppa_values").val(_str);
		ppa.hideHacks();
	};
	
	ppa.initOpts = function() {
		if (vars.productValues.length > 1) {
			$('#ppa_pick_upload').prop('checked', parseInt(vars.productValues[1]) == 1);
			$('#ppa_pick_hide_cart_btn').prop('checked', parseInt(vars.productValues[2]) == 1);
		}
		ppa.changeOpts();
	};
	
	ppa.generateForm = function() {
		if (vars.formDisplayed === true || !vars.designs) return;
		
		var _dId;

		if (typeof vars.productValues === 'string') vars.productValues = vars.productValues.split(':');
		vars.selectedOption = vars.productValues[0];

		$("#ppa_pick").empty().append('<option style="color:#aaa" value="0">-- None --</option>');

		if ($("#ppa_pick").length) {
			
			vars.designs.forEach(function(_itm) {
				_dId = '*' + _itm.id;
				$("#ppa_pick").append('<option style="color:#D00;" iscategory="true" value="' + _dId + '">' + _itm.category_title + '</option>');
				if (_dId == vars.selectedOption) $("#ppa_pick").val(_dId);
				_itm.designs.sort(function(a, b) { return (a.title > b.title) ? 1 : -1; });
				_itm.designs.forEach(function(_d) {
					$("#ppa_pick").append('<option value="' + _d.id + '" >&nbsp; &nbsp; &nbsp; &#187; ' + _d.title + '</option>');
					if (_d.id == vars.selectedOption || _d.oldRef == vars.selectedOption) $("#ppa_pick").val(_d.id);
				});
			})
			
			ppa.initOpts ();
			$("#ppa_pick,#ppa_pick_hide_cart_btn,#ppa_pick_upload").on('change', function() {
				ppa.changeOpts();
			});
			
			vars.formDisplayed = true;
		}
	};
	
	ppa.invalidCredentials = function(_msg) {
		$("#link-ModulePitchprint").click(function() {
			setTimeout(function() { if ($("#w2p-div").length) {
				$("#w2p-div").html(_msg || 'Kindly configure PitchPrint.<br/>If you have, please re-check the API and Secret Keys and ensure they are correctly typed');
				$('#pp_div_footer').hide();
			} }, 500);
		});
	};
	
	ppa.fetchDesigns = function() {
		vars = ppa.vars;
		if (!vars.credentials) return;
		
		if (!vars.credentials.apiKey || !vars.credentials.signature) {
			ppa.invalidCredentials();
			return;
		}
		$.ajax({
			type: "POST",
			dataType: "json",
			url: vars.runtimeBase + 'fetch-designs',
			data: vars.credentials,
			success: function(_msg) {
				if (_msg.error) {
					ppa.invalidCredentials(_msg.error);
				}else{
					vars.designs = _msg;
					ppa.generateForm();
				}
			},
			error: function($jqXHR , $type, $exception) {
				ppa.invalidCredentials();
			}
		});
	};
	
	window.onload = function() {
		vars = ppa.vars;
		$("#link-ModulePitchprint").click(function() {
			if (!vars.formDisplayed) { setTimeout(function() { ppa.generateForm(); }, 4000); }
			ppa.hideHacks();
		});
		$("#link-Customization").click(function() { setTimeout(function() { ppa.hideHacks();}, 1000); } );
	}
	
	ppa.start = function() {
		ppa.readyFncs.forEach(function(_fnc) {
			ppa[_fnc]();
		});
		ppa.readyFncs = [];
	}
	
	ppa.start();
	
})(this);