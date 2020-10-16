// ==UserScript==
// @name         RS2JiraSync Script
// @namespace    https://github.com/Scandltd/rs-tm-scripts/
// @version      0.0.1
// @description  RS to Jira Synchronization Helper Script
// @author       Aleksandr Baliunov
// @author       Alexander Chernyakevich
// @match        http://reports.scand/ureports.php
// @grant        GM_log
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    const ISSUE_BROWSE_PATH = "browse/";
    const ISSUE_REST_PATH = 'rest/api/2/issue/';

    // FIXME: Remove hardcoding of configuration
    GM_setValue("rs2jira.config.0.jira.baseUrl", "https://some-organization.atlassian.net/");
    GM_setValue("rs2jira.config.0.jira.token", "some-token-should-be-here");
    GM_setValue("rs2jira.config.0.rs.ticketIdRegEx", "^\\((SOMEPROJECTID1-\\d+|SOMEPROJECTID1-\\d+)\\)\\s");

    // TODO: Add Config loading
    const synchronizationConfigs = [
        {
            baseUrl: GM_getValue("rs2jira.config.0.jira.baseUrl", ""),
            token: GM_getValue("rs2jira.config.0.jira.token", ""),
            idRegex: new RegExp(GM_getValue("rs2jira.config.0.rs.ticketIdRegEx", ""))
        }
    ];

    // TODO: implemnt configs handling:
    // Add config - detect last available config, increase index, ask every config property and store for index.
    // Change config - prompt index, ask every config property and store for index.
    // Delete config - prompt for index, shift all configs by index and remove the last one.

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
            if ( synchronizationConfigs[i].idRegex.test(description) ) {
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
            let matches = reportSyncConfig.idRegex.exec(rsReport.description);
            let ticketId = matches[matches.length-1];
            let text = rsReport.description.substring(matches[0].length);

            // Add link to Jira ticket to ID part
            rsReport.descriptionTD.innerHTML = rsReport.descriptionTD.innerHTML.replace(
                ticketId, '<a href="' + reportSyncConfig.baseUrl + ISSUE_BROWSE_PATH + ticketId + '" target="_blank">' + ticketId + '</a>');

            // check if report was synced
            if (true) {
                // Add button to remove worklog in Jira
            } else {
                // Add button to create worklog in Jira
            }
        }
    }

})();
