<?php
        /*
        * Plugin Name: PitchPrint
        * Plugin URI: http://pitchprint.com
        * Description: A beautiful web based print customization app for your online store. Integrates with WooCommerce.
        * Author: PitchPrint
        * Version: 8.3.3
        * Author URI: http://pitchprint.com
		* Requires at least: 3.8
		* Tested up to: 4.7
		* 
		* @package PitchPrint
		* @category Core
		* @author PitchPrint
        */
		
	load_plugin_textdomain('PitchPrint', false, basename( dirname( __FILE__ ) ) . '/languages/' );
	
	function register_session(){
		if(!session_id()) session_start();
	}
	function end_session() {
		session_destroy();
	}
	add_action('init','register_session', 0);
	add_action('wp_login','register_session');
	add_action('wp_logout','end_session');
	
	class PitchPrint {
	
		public $version = '8.3.3';
	
		public function __construct() {
			$this->define_constants();
			$this->includes();
			$this->init_hooks();
		}
		
		private function define_constants() {
			define('PP_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );
			define('PP_BASE', 'https://pitchprint.net');
			define('PP_RSCBASE', '//s3.amazonaws.com/pitchprint.rsc/');
			define('PP_CDNBASE', '//dta8vnpq1ae34.cloudfront.net/');
			define('PP_BUILDPATH', 'app/83/');
			define('PP_APP_JS', 'https://dta8vnpq1ae34.cloudfront.net/app/83/js/app.js');
			define('PP_CLIENT_JS', 'https://dta8vnpq1ae34.cloudfront.net/app/83/js/client.js');
			define('PP_ADMIN_JS', 'https://dta8vnpq1ae34.cloudfront.net/app/83/js/a.wp.js');
			define('PP_ADMIN_URLPATH', 'https://pitchprint.net/admin/');
			define('PPCLIENT_DEF', "var PPCLIENT = window.PPCLIENT; if (typeof PPCLIENT === 'undefined') window.PPCLIENT = PPCLIENT = { version: '8.3.3', readyFncs: [] };");
			define('PPADMIN_DEF', "var PPADMIN = window.PPADMIN; if (typeof PPADMIN === 'undefined') window.PPADMIN = PPADMIN = { version: '8.3.3', readyFncs: [] };");
		}
		
		private function includes() {
			include_once('system/settings.php');
		}
		
		private function init_hooks() {
			if ($this->request_type('frontend')) {
				add_filter('woocommerce_get_cart_item_from_session', array($this, 'pp_get_cart_item_from_session'), 10, 2);
				add_filter('woocommerce_get_item_data',  array($this, 'pp_get_cart_mod'), 10, 2);
				add_filter('woocommerce_cart_item_thumbnail', array($this, 'pp_cart_thumbnail'), 70, 2);
				add_filter('woocommerce_add_cart_item_data', array($this, 'pp_add_cart_item_data'), 10, 2);
				
				add_action('woocommerce_before_my_account',  array($this, 'pp_my_recent_order'));
				add_action('woocommerce_add_order_item_meta', array($this, 'pp_add_order_item_meta'), 70, 2);
				
				add_action('wp_head', array($this, 'pp_header_files'));
				add_action('woocommerce_before_add_to_cart_button', array($this, 'add_pp_edit_button'));
				add_action('woocommerce_after_cart', array($this, 'pp_get_cart_action'));
				add_action('woocommerce_after_checkout_form', array($this, 'pp_set_is_checkout'), 1);
				add_action('woocommerce_after_checkout_form', array($this, 'pp_get_cart_action'));
			} else if ($this->request_type('admin')) {
				add_action('admin_menu', array($this, 'ppa_actions'));
				add_action('woocommerce_admin_order_data_after_order_details', array($this, 'ppa_order_details'));
				add_action('woocommerce_product_options_pricing', array($this, 'ppa_design_selection'));
				add_action('woocommerce_process_product_meta', array($this, 'ppa_write_panel_save'));
			}
		}
		
		public function pp_my_recent_order() {
			global $post, $woocommerce;
			wp_enqueue_script('pitchprint_class', PP_CLIENT_JS);
			wp_enqueue_script('prettyPhoto', $woocommerce->plugin_url() . '/assets/js/prettyPhoto/jquery.prettyPhoto.min.js', array( 'jquery' ), $woocommerce->version, true );
			wp_enqueue_script('prettyPhoto-init', $woocommerce->plugin_url() . '/assets/js/prettyPhoto/jquery.prettyPhoto.init.min.js', array( 'jquery' ), $woocommerce->version, true );
			wp_enqueue_style('woocommerce_prettyPhoto_css', $woocommerce->plugin_url() . '/assets/css/prettyPhoto.css' );
			wp_enqueue_style('css_reset', 'https://yui-s.yahooapis.com/2.9.0/build/reset/reset-min.css' );
			
			echo '<div id="pp_mydesigns_div"></div>';
			wc_enqueue_js( PPCLIENT_DEF . " 
				PPCLIENT.vars = {
					client: 'wp',
					apiBase: '" . PP_BASE . "/api/front/',
					cdnBase: '" . PP_CDNBASE . "',
					rscBase: '" . PP_RSCBASE . "',
					pluginRoot: '" . plugins_url('/', __FILE__) . "',
					buildPath: '" . PP_BUILDPATH . "',
					functions: { },
					apiKey: '" . PITCH_APIKEY . "',
					langCode: '" . substr(get_bloginfo('language'), 0, 2) . "',
					userId: '" . (get_current_user_id() === 0 ? 'guest' : get_current_user_id())  . "'
				};
				
				PPCLIENT.afterValidation = 'fetchUserProjects';
				PPCLIENT.readyFncs.push('loadLang', 'validate');
				setTimeout( function() { if (typeof PPCLIENT.start !== 'undefined') PPCLIENT.start(); }, 1000);
			");
		}
		
		public function pp_set_is_checkout() {
			wc_enqueue_js( PPCLIENT_DEF . "
				PPCLIENT.isCheckoutPage = true;
			");
		}
		
		public function pp_get_cart_action() {
			global $post, $woocommerce;
			wp_enqueue_script('pitchprint_class', PP_CLIENT_JS);
			
			wc_enqueue_js( PPCLIENT_DEF . "				
				PPCLIENT.vars = {
					client: 'wp',
					apiBase: '" . PP_BASE . "/api/front/',
					cdnBase: '" . PP_CDNBASE . "',
					rscBase: '" . PP_RSCBASE . "',
					pluginRoot: '" . plugins_url('/', __FILE__) . "',
					buildPath: '" . PP_BUILDPATH . "',
					functions: { },
					apiKey: '" . PITCH_APIKEY . "',
					langCode: '" . substr(get_bloginfo('language'), 0, 2) . "',
					userId: '" . (get_current_user_id() === 0 ? 'guest' : get_current_user_id())  . "'
				};
				
				PPCLIENT.afterValidation = 'sortCart';
				PPCLIENT.readyFncs.push('loadLang', 'validate', 'loadStyle');
				setTimeout( function() { if (typeof PPCLIENT.start !== 'undefined') PPCLIENT.start(); }, 1000);
			");
		}
		
		public function pp_cart_thumbnail($img, $val) {
			if (!empty($val['_w2p_set_option'])) {
				$itm = $val['_w2p_set_option'];
				$itm = json_decode(rawurldecode($itm), true);
				if ($itm['type'] == 'p') {
					$img = '<img style="width:90px" src="' . PP_RSCBASE . 'images/previews/' . $itm['projectId'] . '_1.jpg" >';
				} else {
					$img = '<img style="width:90px" src="' . $itm['previews'][0] . '" >';
				}
			}
			return $img;
		}
		
		public function pp_get_cart_mod( $item_data, $cart_item ) {
			if (!empty($cart_item['_w2p_set_option'])) {
				$val = $cart_item['_w2p_set_option'];
				$itm = json_decode(rawurldecode($val), true);
				$item_data[] = array(
					'name'    => '<span id="' . $val . '" class="pp-cart-label"></span>',
					'display' => '<a href="#" id="' . $val . '" class="button pp-cart-data"></a>'
				);
			}
			return $item_data;
		}
		
		public function pp_add_order_item_meta($item_id, $cart_item) {
			global $woocommerce;
			if (!empty($cart_item['_w2p_set_option'])) wc_add_order_item_meta($item_id, '_w2p_set_option', $cart_item['_w2p_set_option']);
		}
		
		public function pp_get_cart_item_from_session($cart_item, $values) {
			if (!empty($values['_w2p_set_option'])) $cart_item['_w2p_set_option'] = $values['_w2p_set_option'];
			return $cart_item;
		}
		
		public function pp_add_cart_item_data($cart_item_meta, $product_id) {
			$_projects = $_SESSION['pp_projects'];
			if (isset($_projects)) {
				if (isset($_projects[$product_id])) {
					$cart_item_meta['_w2p_set_option'] = $_projects[$product_id];
					unset($_SESSION['pp_projects'][$product_id]);
				}
			}
			return $cart_item_meta;
		}
		
		public function add_pp_edit_button() {
			global $post;
			global $woocommerce;
			$pp_mode = 'new';
			$pp_set_option = get_post_meta( $post->ID, '_w2p_set_option', true );
			if (strpos($pp_set_option, ':') === false) $pp_set_option = $pp_set_option . ':0';
			$pp_set_option = explode(':', $pp_set_option);
			if (count($pp_set_option) === 2) $pp_set_option[2] = 0;
			$pp_project_id = '';
			$pp_uid = get_current_user_id() === 0 ? 'guest' : get_current_user_id();
			$pp_now_value = '';
			$pp_previews = '';
			$pp_upload_ready = false;
			
			$_projects = $_SESSION['pp_projects'];
			
			if (isset($_projects)) {
				if (isset($_projects[$post->ID])) {
					$pp_now_value = $_projects[$post->ID];
					$opt_ = json_decode(rawurldecode($_projects[$post->ID]), true);
					if ($opt_['type'] === 'u') {
						$pp_upload_ready = true;
						$pp_mode = 'upload';
					} else if ($opt_['type'] === 'p') {
						$pp_mode = 'edit';
						$pp_project_id = $opt_['projectId'];
						$pp_previews = $opt_['numPages'];
					}
				}
			}
			
			$userData = '';
			
			if (is_user_logged_in()) {
				global $current_user;
				wp_get_current_user();
				$fname = addslashes(get_user_meta($current_user->ID, 'first_name', true ));
				$lname = addslashes(get_user_meta($current_user->ID, 'last_name', true ));
				$address_1 = $woocommerce->customer->get_address();
				$address_2 = $woocommerce->customer->get_address_2();
				$city = $woocommerce->customer->get_city();
				$postcode = $woocommerce->customer->get_postcode();
				$state = $woocommerce->customer->get_state();
				$country = WC()->countries->countries[$woocommerce->customer->get_country()];
				$phone = '';
				
				$address = "{$address_1}<br>";
				if (!empty($address_2)) $address .= "{$address_2}<br>";
				$address .= "{$city} {$postcode}<br>";
				if (!empty($state)) $address .= "{$state}<br>";
				$address .= $country;
				$address = addslashes($address);
				
				$userData = ",
					userData: {
						email: '" . $current_user->user_email . "',
						name: '{$fname} {$lname}',
						firstname: '{$fname}',
						lastname: '{$lname}',
						telephone: '{$phone}',
						address: '{$address}'.split('<br>').join('\\n')
					}";
			}
				
			wc_enqueue_js( PPCLIENT_DEF . " 
				PPCLIENT.vars = {
					client: 'wp',
					uploadUrl: '" . plugins_url('uploader/', __FILE__) . "',
					apiBase: '" . PP_BASE . "/api/front/',
					cdnBase: '" . PP_CDNBASE . "',
					rscBase: '" . PP_RSCBASE . "',
					pluginRoot: '" . plugins_url('/', __FILE__) . "',
					buildPath: '" . PP_BUILDPATH . "',
					functions: { },
					cValues: '{$pp_now_value}',
					projectId: '{$pp_project_id}',
					userId: '{$pp_uid}',
					previews: '{$pp_previews}',
					mode: '{$pp_mode}',
					langCode: '" . substr(get_bloginfo('language'), 0, 2) . "',
					enableUpload: {$pp_set_option[1]},
					designId: '{$pp_set_option[0]}',
					apiKey: '" . PITCH_APIKEY . "',
					product: {
						id: '" . $post->ID . "',
						name: '{$post->post_name}'
					}{$userData}
				};
				PPCLIENT.readyFncs.push('validate');
				if (typeof PPCLIENT.start !== 'undefined') PPCLIENT.start();
			");
					
			echo '
				<input type="hidden" id="_w2p_set_option" name="_w2p_set_option" value="' . $pp_now_value . '" />
				<div id="pp_main_btn_sec" class="ppc-main-btn-sec" > </div>';
			
		}
		
		public function pp_header_files() {
			global $post, $product;
			$pp_set_option = get_post_meta($post->ID, '_w2p_set_option', true);
			if (!empty($pp_set_option)) {
				wp_enqueue_script('pitchprint_editor', PP_APP_JS);
				wp_enqueue_script('pitchprint_class', PP_CLIENT_JS);
			}
		}
		
		public function ppa_write_panel_save( $post_id ) {
			update_post_meta($post_id, '_w2p_set_option', $_POST['ppa_values']);
		}
		
		public function show_ppa_admin() {
			if (!class_exists('WooCommerce')) {
				echo ('<h3>This plugin depends on WooCommerce plugin. Kindly install <a target="_blank" href="https://wordpress.org/plugins/woocommerce/">WooCommerce here!</a></h3>');
				exit();
			}
			$issues = '';
			$apiKey = defined('PITCH_APIKEY') ? PITCH_APIKEY : '';
			$secretKey = defined('PITCH_SECRETKEY') ? PITCH_SECRETKEY : '';
			
			if (!is_writable(plugin_dir_path(__FILE__) . 'system/settings.php')) {
				$issues .= '<br/><br/>' . __("Sorry, the file", 'PitchPrint') . ' "' . plugin_dir_path(__FILE__) . 'system/settings.php" ' . __("is not writable.", 'PitchPrint');
			}
			
			if (!is_writable(plugin_dir_path(__FILE__) . 'uploader/files')) {
				$issues .= '<br/><br/>' . __("Sorry, the path", 'PitchPrint') . ' "' . plugin_dir_path(__FILE__) . 'uploader/files/" ' . __("is not writable. Kindly set that folder permissions to 0775", 'PitchPrint');
			}
			
			if (!is_writable(plugin_dir_path(__FILE__) . 'uploader/files/thumbnail')) {
				$issues .= '<br/><br/>' . __("Sorry, the path", 'PitchPrint') . ' "' . plugin_dir_path(__FILE__) . 'uploader/files/thumbnail/" ' . __("is not writable. Kindly set that folder permissions to 0775", 'PitchPrint');
			}
			
			if (isset($_POST['ppa_inpt_apiKey']) && isset($_POST['ppa_inpt_secretKey']) && $issues === '') {
				if (!empty($_POST['ppa_inpt_apiKey']) && !empty($_POST['ppa_inpt_secretKey'])) {
					$apiKey = trim($_POST['ppa_inpt_apiKey']);
					$secretKey = trim($_POST['ppa_inpt_secretKey']);
					$str = "<?php define('PITCH_APIKEY', '{$apiKey}'); define('PITCH_SECRETKEY', '{$secretKey}'); ?>";
					$handle = fopen(plugin_dir_path(__FILE__) . "system/settings.php", "wb");
					fwrite($handle, $str);
					fclose($handle);
				}
			}
			
			if ($issues !== '') {
				echo '<h3 class="wrap" style="color:#F00">' . $issues . '</h3>';
				exit();
			}
			
			echo '<div class="wrap">
				<div style="margin-top:20px; font-size:16px"><br/><b>PITCHPRINT ' . __("SETTINGS", "PitchPrint") . ':</b><br/></div><div style="margin:20px;">
				<form method="post" action="">
					<label style="display:inline-block; width:120px">API KEY:</label> <input style="width:320px" name="ppa_inpt_apiKey" type="text" value="' . $apiKey . '" /><br/>
					<label style="display:inline-block; width:120px">SECRET KEY:</label> <input style="width:320px" name="ppa_inpt_secretKey" type="text" value="' . $secretKey . '" /><br/><br/>
					<label style="display:inline-block; width:120px"></label> <input style="width:120px" class="button action" type="submit" value="' . __("Update", "PitchPrint") . '.." /><br/>
				</form></div></div>
				
				<div class="wrap">
					<div class="frm-section-inner-noline" style="padding-left: 140px; margin-top:40px;" >
						<span style="font-size:10px; font-style:italic">' . __("To generate keys, manage designs, pitcures, templates etc, please login to the admin panel", "PitchPrint") . '</span><br/><br/>
						<a href="' . PP_ADMIN_URLPATH . 'domains" target="_blank"><input type="submit" class="button action" value="' . __("LAUNCH PITCHPRINT ADMIN PANEL", "PitchPrint") . '" /></a>
					</div>
				</div>';
		}
		
		public function ppa_actions() {
			add_menu_page('PitchPrint', 'PitchPrint', 'manage_options', 'w2p', array($this, 'show_ppa_admin'));
		}
		
		public function ppa_order_details() {
			global $post, $woocommerce;
			wp_enqueue_script('pitchprint_admin', PP_ADMIN_JS);
			wc_enqueue_js( PPADMIN_DEF . "
				PPADMIN.vars = {
					cdnBase: '" . PP_CDNBASE . "',
					rscBase: '" . PP_RSCBASE . "',
					runtimeBase: '" . PP_BASE . "/api/runtime/',
					buildPath: '" . PP_BUILDPATH . "',
					adminPath: '" . PP_BASE . "/admin/',
					credentials: { timestamp: '" . $timestamp . "', apiKey: '" . PITCH_APIKEY . "', signature: '" . $signature . "'},
					selectedOption: '{$ppa_selected_option[0]}'
				};
				PPADMIN.readyFncs.push('init');
				if (typeof PPADMIN.start !== 'undefined') PPADMIN.start();
			");
		}
		
		function ppa_design_selection() {
			if (!class_exists('WooCommerce')) exit;
			global $post, $woocommerce;
			
			wp_enqueue_script('pitchprint_admin', PP_ADMIN_JS);
			$timestamp = time();
			$signature = md5(PITCH_APIKEY . PITCH_SECRETKEY . $timestamp);
			
			echo '</div><div class="options_group show_if_simple show_if_variable"><input type="hidden" value="' . get_post_meta( $post->ID, '_w2p_set_option', true ) . '" id="ppa_values" name="ppa_values" >';
			
			$ppa_upload_selected_option = '';
			$ppa_hide_Cart_btn_option = '';
			$ppa_selected_option = get_post_meta( $post->ID, '_w2p_set_option', true );
			$ppa_selected_option = explode(':', $ppa_selected_option);
			if (count($ppa_selected_option) > 1) $ppa_upload_selected_option = ($ppa_selected_option[1] === '1' ? 'checked' : '');
			if (count($ppa_selected_option) > 2) $ppa_hide_Cart_btn_option = ($ppa_selected_option[2] === '1' ? 'checked' : '');
			
			woocommerce_wp_select( array(
					'id'            => 'ppa_pick',
					'value'			=>	$ppa_selected_option[0],
					'wrapper_class' => '',
					'options'       => array('' => 'None'),
					'label'         => 'PitchPrint Design',
					'desc_tip'    	=> true,
					'description' 	=> __("Visit the PitchPrint Admin Panel to create and edit designs", 'PitchPrint')
				) );
				
			woocommerce_wp_checkbox( array(
					'id'            => 'ppa_pick_upload',
					'value'		    => $ppa_upload_selected_option,
					'label'         => '',
					'cbvalue'		=> 'checked',
					'description' 	=> '&#8678; ' . __("Check this to enable clients to upload their files", 'PitchPrint')
				) );
			wc_enqueue_js( PPADMIN_DEF . "
				PPADMIN.vars = {
					cdnBase: '" . PP_CDNBASE . "',
					rscBase: '" . PP_RSCBASE . "',
					runtimeBase: '" . PP_BASE . "/api/runtime/',
					adminPath: '" . PP_BASE . "/admin/',
					credentials: { timestamp: '" . $timestamp . "', apiKey: '" . PITCH_APIKEY . "', signature: '" . $signature . "'},
					selectedOption: '{$ppa_selected_option[0]}'
				};
				PPADMIN.readyFncs.push('init', 'fetchDesigns');
				if (typeof PPADMIN.start !== 'undefined') PPADMIN.start();
			");
		}
		
		private function request_type( $type ) {
			switch ( $type ) {
				case 'admin' :
					return is_admin();
				case 'ajax' :
					return defined( 'DOING_AJAX' );
				case 'cron' :
					return defined( 'DOING_CRON' );
				case 'frontend' :
					return ( ! is_admin() || defined( 'DOING_AJAX' ) ) && ! defined( 'DOING_CRON' );
			}
		}
		
	}
	
	$PitchPrint = new PitchPrint();
	
?>