const DEBUG = false;

GM_log("dddd");

// ----- CONFIGURATION MANAGEMENT RELATED PART START -----
const configHelper = new function () {
    this.NAMESPACE = "rs2jira.config.";
    this.JIRA_BASEURL = ".jira.baseUrl";
    this.JIRA_TOKEN = ".jira.token";
    this.RS_IDREGEXP = ".rs.idRegExp";
    this.getConfigJiraBaseUrl = function(idx) {
        return GM_getValue(this.NAMESPACE + idx + this.JIRA_BASEURL, "");
    }
    this.getConfigJiraToken = function(idx) {
        return GM_getValue(this.NAMESPACE + idx + this.JIRA_TOKEN, "");
    }
    this.getConfigRsIdRegExp = function(idx) {
        return GM_getValue(this.NAMESPACE + idx + this.RS_IDREGEXP, "");
    }
    this.newConfig = function(jiraBaseUrl, jiraToken, rsIdRegExpStr) {
        if ( jiraBaseUrl !== "" && jiraToken !== "" && rsIdRegExpStr !== "" ) {
            return {
                baseUrl: jiraBaseUrl,
                token: jiraToken,
                idRegExp: new RegExp(rsIdRegExpStr)
            };
        } else {
            return null;
        }
    }
    this.loadConfig = function(idx) {
        let config = this.newConfig(this.getConfigJiraBaseUrl(idx), this.getConfigJiraToken(idx), this.getConfigRsIdRegExp(idx));
        if ( config == null && DEBUG ) {
            alert("Something wrong with loaded config #" + idx + "\n" +
                  this.getConfigInfo(this.getConfigJiraBaseUrl(idx),
                                     this.getConfigJiraToken(idx),
                                     this.getConfigRsIdRegExp(idx)));
        }
        return config;
    }
    this.loadConfigs = function() {
        let configs = [];
        let i = 0;
        let config = this.loadConfig(i);
        while ( config ) {
            configs.push(config);
            i++;
            config = this.loadConfig(i);
        }
        return configs;
    }
    this.getConfigInfo = function(jiraBaseUrl, jiraToken, rsIdRegExpStr) {
        return "\n\tbaseUrl: " + jiraBaseUrl + "\n\ttoken: " + ( DEBUG ? jiraToken : "*****" ) + "\n\tidRegExp: " + rsIdRegExpStr;
    }
    this.showConfig = function(idx) {
        alert("Config #" + idx + "\n" +
              this.getConfigInfo(synchronizationConfigs[idx].baseUrl,
                                 synchronizationConfigs[idx].token,
                                 synchronizationConfigs[idx].idRegExp.source));
    }
    this.showAllConfigs = function() {
        let alertStr = "";
        for (let i=0; i < synchronizationConfigs.length; i++) {
            alertStr += "Config #" + i + "\n" + this.getConfigInfo(synchronizationConfigs[i].baseUrl,
                                                                   synchronizationConfigs[i].token,
                                                                   synchronizationConfigs[i].idRegExp.source) + "\n\n";
        }
        alert(alertStr);
    }
    this.promptConfig = function(advJiraBaseUrl, advRsIdRegExp) {
        return {
            jiraBaseUrl: prompt("Enter Jira Base URL", advJiraBaseUrl),
            jiraToken: prompt("Enter Jira access token", "some-token-should-be-here"),
            rsIdRegExpStr: prompt("Enter ticket ID parsing RegExp", advRsIdRegExp)
        }
    }
    this.saveConfig = function(idx) {
        GM_setValue(this.NAMESPACE + idx + this.JIRA_BASEURL, synchronizationConfigs[idx].baseUrl);
        GM_setValue(this.NAMESPACE + idx + this.JIRA_TOKEN, synchronizationConfigs[idx].token);
        GM_setValue(this.NAMESPACE + idx + this.RS_IDREGEXP, synchronizationConfigs[idx].idRegExp.source);
    }
    this.saveConfigs = function() {
        for (let i=0; i < synchronizationConfigs.length; i++) {
            this.saveConfig(i);
        }
    }
    this.removeConfig = function(idx) {
        if ( confirm("Are sure you would like to remove config #" + idx + "?\n" +
                     this.getConfigInfo(synchronizationConfigs[idx].baseUrl,
                                        synchronizationConfigs[idx].token,
                                        synchronizationConfigs[idx].idRegExp.source)) ) {
            let lastConfigIdx = synchronizationConfigs.length - 1;
            GM_deleteValue(this.NAMESPACE + lastConfigIdx + this.JIRA_BASEURL);
            GM_deleteValue(this.NAMESPACE + lastConfigIdx + this.JIRA_TOKEN);
            GM_deleteValue(this.NAMESPACE + lastConfigIdx + this.RS_IDREGEXP);
            synchronizationConfigs.splice(idx, 1);
            this.saveConfigs();
            alert("Removed!");
        } else {
            alert("Good, you are quite cautious. :)");
        }
    }
}

function addSynchronizationConfig() {
    const {jiraBaseUrl, jiraToken, rsIdRegExpStr} =
          configHelper.promptConfig("https://<some.organization.here>.atlassian.net/",
                                    "^\\((OPC-\\d+|PROC-\\d+|S2PPRJ-\\d+|S2PPRJTEST-\\d+)\\)\\s");
    let config = configHelper.newConfig(jiraBaseUrl, jiraToken, rsIdRegExpStr);
    if ( config ) {
        synchronizationConfigs.push(config);
        let lastConfigIdx = synchronizationConfigs.length - 1;
        configHelper.saveConfig(lastConfigIdx);
        alert("Config #" + lastConfigIdx + " successfully added.");
    } else {
        alert("Can't update config, something wrong with your data:" +
              configHelper.getConfigInfo(jiraBaseUrl, jiraToken, rsIdRegExpStr));
    }
}
function changeSynchronizationConfig() {
    if ( synchronizationConfigs.length > 0 ) {
        let idx = +prompt("Provide index of config you would like to change (0-" + (synchronizationConfigs.length - 1) + ")", 0);
        if ( idx < synchronizationConfigs.length ) {
            let config = synchronizationConfigs[idx];
            const {jiraBaseUrl, jiraToken, rsIdRegExpStr} = configHelper.promptConfig(config.baseUrl, config.idRegExp.source);
            config = configHelper.newConfig(jiraBaseUrl, jiraToken, rsIdRegExpStr);
            if ( config ) {
                synchronizationConfigs[idx] = config;
                configHelper.saveConfig(idx);
                alert("Config #" + idx + " successfully updated.");
            } else {
                alert("Can't update config, something wrong with your data:" +
                      configHelper.getConfigInfo(jiraBaseUrl, jiraToken, rsIdRegExpStr));
            }
        } else {
            alert("No config for index " + idx + " is available. Try other!");
        }
    } else {
        alert("No configs to change are available. First add any config!");
    }
}
function showSynchronizationConfigs() {
    configHelper.showAllConfigs();
}
function removeSynchronizationConfig() {
    if ( synchronizationConfigs.length > 0 ) {
        let idx = +prompt("Provide index of config you would like to remove (0-" + (synchronizationConfigs.length - 1) + ")",
                          synchronizationConfigs.length - 1);
        if ( idx < synchronizationConfigs.length ) {
            configHelper.removeConfig(idx);
        } else {
            alert("No config for index " + idx + " is available. Try other!");
        }
    } else {
        alert("No configs available at all!");
    }
}
GM_registerMenuCommand('Add synchronization config', addSynchronizationConfig, 'a');
GM_registerMenuCommand('Show synchronization configs', showSynchronizationConfigs, 's');
GM_registerMenuCommand('Change synchronization config', changeSynchronizationConfig, 'c');
GM_registerMenuCommand('Remove synchronization config', removeSynchronizationConfig, 'r');

let synchronizationConfigs = configHelper.loadConfigs();

// ----- CONFIGURATION MANAGEMENT RELATED PART END -----

