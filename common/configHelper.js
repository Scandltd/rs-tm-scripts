let configHelper = new function () {
    this.defaultNamespace = '<namespace>';
    this.configToPrettyString = function(key) {
        return '\t' + key + '\n\t' + GM_getValue(key);
    }
    this.updateConfig = () => {
        let key = prompt('Enter configuration key', this.defaultNamespace + '.config');
        if ( key != null && key != '' ) {
            let configStr = prompt('Enter configuration JSON', GM_getValue(key, '{"propertie": "value"}'));
            if ( configStr != null && configStr != '' ) {
                GM_setValue(key, configStr);
                alert('Configuration saved as:\n' + this.configToPrettyString(key));
            } else {
                alert('Value should not be empty.');
            }
        } else {
            alert('Key should not be empty.');
        }
    }
    this.showConfig = () => {
        let key = prompt('Enter configuration key', this.defaultNamespace + '.config');
        if ( key != null && key != '' ) {
            alert('Configuration:\n' + this.configToPrettyString(key));
        } else {
            alert('Key should not be empty.');
        }
    }
    this.deleteConfig = () => {
        let key = prompt('Enter configuration key', this.defaultNamespace + '.config');
        if ( key != null && key != '' ) {
            if ( confirm('Are you sure you would like to delete config:\n' +
                         this.configToPrettyString(key)) ) {
                GM_deleteValue(key);
                alert('Configuration deleted successfully.');
            }
        } else {
            alert('Key should not be empty.');
        }
    }
    this.getConfigObject = (configString, parseErrorAlertMessage, postProcessing = (obj) => {} ) => {
        let obj = null;
        try {
            obj = JSON.parse(configString);
            postProcessing(obj);
        } catch (e) {
            if ( parseErrorAlertMessage != null && parseErrorAlertMessage != '' ) {
                alert(parseErrorAlertMessage);
            }
            GM_log('Can\'t parse and build config string. Exception:')
            GM_log(e.message)
        }
        return obj;
    }
    this.addConfigMenu = (namespace) => {
        this.defaultNamespace = namespace;
        GM_registerMenuCommand('Update Config', configHelper.updateConfig, 'u');
        GM_registerMenuCommand('Show Config', configHelper.showConfig, 's');
        GM_registerMenuCommand('Delete Config', configHelper.deleteConfig, 'd');
    }
};
