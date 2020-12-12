// ==UserScript==
// @name         RS2JiraSync
// @namespace    https://github.com/Scandltd/rs-tm-scripts/
// @version      0.0.2
// @description  RS to Jira Synchronization Helper Script
// @author       Aleksandr Baliunov
// @author       Alexander Chernyakevich
// @match        http://reports.scand/ureports.php
// @match        http://reports.scand/pdetails.php
// @match        https://reports.scand.by/ureports.php
// @match        https://reports.scand.by/pdetails.php
// @grant        GM_log
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @require      https://github.com/Scandltd/rs-tm-scripts/raw/dev-simplified/rs2jira-env.js
// @require      https://github.com/Scandltd/rs-tm-scripts/raw/dev-simplified/rs2jira-cm.js
// ==/UserScript==

(function() {
    'use strict';

    let synchronizationConfigs = configHelper.loadConfigs();

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
