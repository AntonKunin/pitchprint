/*!
* PitchPrint - v8.3.0 - Auto-compiled on this 9th day of February in the year of our Lord 2017 
* @author SynergicLabs
*/var PPADMIN=PPADMIN||{version:"8.3.0",readyFncs:[]};!function(a){"use strict";if(!jQuery)throw new Error("jQuery required for PitchPrint!");var b=jQuery,c=a.PPADMIN;c.vars||(c.vars={});var d;c.init=function(){function a(a,b){var c="";"u"===a.type?(c="Uploaded Files: &nbsp;&nbsp;&nbsp;",a.files.forEach(function(a,b){c+='<a target="_blank" href="'+a+'" >File '+(b+1)+"</a> &nbsp;&nbsp;&nbsp;"}),d.previews.push("PitchPrint:")):(c='&#8226; <a target="_blank" href="'+d.adminPath+"orders/"+(a.projectId||a.projectID)+'">Download PDF File</a>',c+='<br/>&#8226; <a target="_blank" href="'+d.adminPath+"raster/"+(a.projectId||a.projectID)+'" >Download Raster Renderings</a>',c+='<br/>&#8226; <a target="_blank" href="'+d.adminPath+"editor/edit-project/?m=edit&p="+(a.projectId||a.projectID)+"&u="+(a.userID||a.userId)+'">Load Project and Modify</a>',a.designTitle&&(c+="<br/>&#8226; Design: "+a.designTitle),d.previews.push([(a.legacy?"../wp-content/plugins/pitchprint/image/data/previews/":d.rscBase+"images/previews/")+(a.projectId||a.projectID)+"_1.jpg"])),b.html(c)}function e(a){try{var b=JSON.parse(decodeURIComponent(a));return!(!b.type||!b.product)}catch(c){return!1}return!0}d=c.vars,d.previews=[];var f,g,h=0;b("table p").each(function(){var c=b(this);e(c.html())?a(JSON.parse(decodeURIComponent(c.html())),c):c.html().indexOf(d.customID)>=0&&(f=c.html().split("|"),"u"==f[2]?(g={files:[]},g.type="u",f[3].split(",").forEach(function(a,b){g.files.push(a)})):g={projectId:f[2],userID:f[1],mata:{},product:{},numPages:f[3].split(",").length,legacy:!0,type:"p"},a(g,c))}),b("th").each(function(){if(b(this).html().indexOf("_w2p_set_option")>=0){var a="string"==typeof d.previews[h]?d.previews[h]:'<img src="'+d.previews[h][0]+'" width="150" />';b(this).html(a),h++}})},c.fetchDesigns=function(){if(d.credentials)return""===d.credentials.apiKey||""===d.credentials.signature?void c.alert({message:"Kindly provide your API and Secret Keys. Thank you!"}):void b.ajax({type:"POST",dataType:"json",url:d.runtimeBase+"/fetch-designs",data:d.credentials,success:function(a){a.error?c.alert(a):c.generateForm(a)}})},c.generateForm=function(a){a.sort(function(a,b){return a.category_title>b.category_title?-1:1}).reverse();var e;a.forEach(function(a){e="*"+a.id,b("#ppa_pick").append('<option style="color:black;" iscategory="true" value="'+e+'">'+a.category_title+"</option>"),e==d.selectedOption&&b("#ppa_pick").val(e),a.designs.sort(function(a,b){return a.title>b.title?-1:1}).reverse(),a.designs.forEach(function(a){b("#ppa_pick").append('<option style="color:#aaa" value="'+a.id+'" >&nbsp; &nbsp; &nbsp; &#187; '+a.title+"</option>"),a.id!=d.selectedOption&&a.oldRef!=d.selectedOption||b("#ppa_pick").val(a.id)})}),b("#ppa_pick,#ppa_pick_upload,#ppa_pick_hide_cart_btn").on("change",c.changeOpts)},c.changeOpts=function(){var a=b("#ppa_pick").val();a+=":"+(b("#ppa_pick_upload").is(":checked")?1:0),b("#ppa_pick_hide_cart_btn").length&&(a+=":"+(b("#ppa_pick_hide_cart_btn").is(":checked")?1:0)),b("#ppa_values").val(a)},c.alert=function(a){b("#ppa_pick").parent().prepend('<span style="color:#F00">'+a.message+"</span>"),b("#ppa_pick").hide(),b(".ppa_pick_hide_cart_btn_field").hide(),b(".ppa_pick_upload_field").hide()},c.start=function(){c.readyFncs.forEach(function(a){c[a]()}),c.readyFncs=[]},c.start()}(this);