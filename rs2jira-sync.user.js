// ==UserScript==
// @name         RS2JiraSync
// @namespace    https://github.com/Scandltd/rs-tm-scripts/
// @version      0.0.1
// @description  RS to Jira Synchronization Helper Script
// @author       Aleksandr Baliunov
// @author       Alexander Chernyakevich
// @match        http://reports.scand/ureports.php
// @grant        GM_log
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    const DEBUG = false;

    // ----- CONFIGURATION RELATED PART START -----
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
    GM_registerMenuCommand('Add synchronization config', addSynchronizationConfig);
    GM_registerMenuCommand('Show synchronization configs', showSynchronizationConfigs);
    GM_registerMenuCommand('Change synchronization config', changeSynchronizationConfig);
    GM_registerMenuCommand('Remove synchronization config', removeSynchronizationConfig);

    let synchronizationConfigs = configHelper.loadConfigs();

    // ----- CONFIGURATION RELATED PART END -----

    const ISSUE_BROWSE_PATH = "browse/";
    const ISSUE_REST_PATH = 'rest/api/2/issue/';

    function getRSReportFromTR(reportTR) {
        // Could depend on project/user tab, user/teamlead/PM/admin role:
        // {id, date, startTime, durationInHours, durationInSeconds, description, dateTD, startTimeTD, durationTD, descriptionTD}.
        let report = {};
        let cells = reportTR.getElementsByTagName("td");
        for (let i = 0; i < cells.length; i++) {
            if ( cells[i].width == "15" ) {
                report.id = cells[i].getElementsByTagName("input")[0].value;
            } else if ( cells[i].width == "75" ) {
                report.dateTD = cells[i];
                report.date = cells[i].innerText;
            } else if ( cells[i].width == "60" ) {
                report.startTimeTD = cells[i];
                report.startTime = cells[i].innerText;
            } else if ( cells[i].width == "40" ) {
                report.durationTD = cells[i];
                report.durationInHours = +cells[i].innerText;
                report.durationInSeconds = report.durationInHours * 3600;
            } else if ( cells[i].width == "" ) {
                report.descriptionTD = cells[i];
                report.description = cells[i].innerText;
            }
        }

        return report;
    }

    function getMatchingReportSynchronizationConfig(description) {
        let config = null;
        for (let i = 0; i < synchronizationConfigs.length; i++) {
            if ( synchronizationConfigs[i].idRegExp.test(description) ) {
                config = synchronizationConfigs[i];
                break;
            }
        }
        return config;
    }

    const containerTables = document.getElementsByClassName("table-layout-fixed");
    const reportsTable = ( containerTables.length > 0 ? containerTables[0].getElementsByTagName("table")[0] : null );
    const rows = ( reportsTable ? reportsTable.rows : [] );

    for (let i = 0; i < rows.length-1; i++) {
        let reportTR = rows[i];
        let rsReport = getRSReportFromTR(reportTR);

        let reportSyncConfig = getMatchingReportSynchronizationConfig(rsReport.description);
        if ( reportSyncConfig ) {
            let matches = reportSyncConfig.idRegExp.exec(rsReport.description);
            let ticketId = matches[matches.length-1];
            let text = rsReport.description.substring(matches[0].length);

            // Add link to Jira ticket to ID part
            rsReport.descriptionTD.innerHTML = rsReport.descriptionTD.innerHTML.replace(
                ticketId, '<a href="' + reportSyncConfig.baseUrl + ISSUE_BROWSE_PATH + ticketId + '" target="_blank">' + ticketId + '</a>');

            // TODO: check if report was synced
            if (true) {
                // TODO: Add button to remove worklog in Jira
            } else {
                // TODO: Add button to create worklog in Jira
            }
        }
    }

})();
