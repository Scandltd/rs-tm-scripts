// ==UserScript==
// @name         UniversalConfigurator
// @namespace    https://bitbucket.org/achernyakevich/tampermonkey-scripts/
// @version      0.1
// @description  Universal Configurator used to configure any other scripts by storing Tampermonkey values
// @author       Alexander Chernyakevich <tch@scand.com>
// @match        http://reports.scand/default.php
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @grant        GM_log
// @grant        GM_listValues
// @require      https://github.com/Scandltd/rs-tm-scripts/raw/dev-simplified/common/configHelper.js
// ==/UserScript==

(function() {
    'use strict';

    GM_registerMenuCommand('Update Config', configHelper.updateConfig, 'u');
    GM_registerMenuCommand('Show Config', configHelper.showConfig, 's');
    GM_registerMenuCommand('Delete Config', configHelper.deleteConfig, 'd');

})();
