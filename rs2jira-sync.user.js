// ==UserScript==
// @name         RS2JiraSync Script
// @namespace    http://reports.scand/
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

    function changeJiraToken() {
        GM_setValue("rs2jira.jira.token", prompt("JIRA token", GM_getValue("rs2jira.jira.token", "some-jira-token-should-be-entered-here")));
    }

    GM_registerMenuCommand('Change JIRA token', changeJiraToken);

    const configs = [
        {
            baseUrl: 'https://route4gas.atlassian.net/',
            idRegex: /^\((DEV-\d+)\)\s/,
            textRegex: /^\(DEV-\d+\)\s(.+)$/,
            token: GM_getValue("rs2jira.jira.token", ""),
            headers: null,
        }
    ];

    const BASE_PATH = 'rest/api/2/issue/';

    const DATE_REGEX = /^(\d{2})-(\d{2})-(\d{4})$/;

    const padStart = (number) => number < 10 ? `0${number}` : `${number}`;

    function createNewButton(btnText) {
        const button = document.createElement("button");
        button.style.width = '100%';
        button.style.height = 'auto';
        button.style.cursor = 'pointer';
        button.style.backgroundColor = '#FFFFFF';
        button.innerHTML = btnText;
        return button;
    }

    function createActionTd() {
        const actionTd = document.createElement("td");
        actionTd.style.backgroundColor = '#FFFFFF';
        actionTd.style.padding = 0;
        return actionTd;
    }

    function getheaders(token) {
        return {
            'Authorization': 'Basic ' + token,
            'Content-Type': 'application/json',
        };
    }

    function getScandReportRowData(actionTd) {
        const descriptionTd = actionTd.previousElementSibling;
        const hoursTd = descriptionTd.previousElementSibling;
        const timeTd = hoursTd.previousElementSibling;
        const dateTd = timeTd.previousElementSibling;

        const date = dateTd.innerText;
        const time = timeTd.innerText;
        const hours = +hoursTd.innerText;
        const scandTimeSpentSeconds = hours * 3600;
        const description = descriptionTd.innerText;

        return {
            date,
            time,
            scandTimeSpentSeconds,
            description,
        };
    }

    function checkConfig(configs, description) {
        let checkedDescription = null;
        const foundConfig = configs.find(config => {
            checkedDescription = config.idRegex.exec(description);
            if (checkedDescription) {
                if (!config.headers) {
                    while (!(config.token = GM_getValue("rs2jira.jira.token", null))) {
                        changeJiraToken();
                    }
                    config.headers = getheaders(config.token);
                }
                return true;
            }
            return false;
        });

        if (foundConfig) {
            const {textRegex} = foundConfig;
            const ticketId = checkedDescription[1];
            const reportText = textRegex.exec(description)[1];

            return {
                config: foundConfig,
                ticketId,
                reportText,
            };
        }

        return null;
    }

    const matchWorklog = ({date, time, scandTimeSpentSeconds}, worklogs) => worklogs.find(worklog => {
        const {started, timeSpentSeconds} = worklog;
        const dateData = new Date(started);
        const day = dateData.getDate();
        const month = dateData.getMonth() + 1;
        const year = dateData.getFullYear();

        const hours = dateData.getHours();
        const minutes = dateData.getMinutes();
        const seconds = dateData.getSeconds();

        const formattedDate = `${padStart(day)}-${padStart(month)}-${year}`;
        const formattedTime = `${padStart(hours)}:${padStart(minutes)}:${padStart(seconds)}`;

        return date === formattedDate && time === formattedTime && scandTimeSpentSeconds === timeSpentSeconds;
    });

    function syncWorklogInJira(config, reportData, ticketId) {
        const {date, time, scandTimeSpentSeconds, reportText} = reportData;

        const [_, day, month, year] = DATE_REGEX.exec(date);
        const started = `${year}-${month}-${day}T${time}.000+0300`; // TODO: Need to check this format ("2017-03-14T10:35:37.095++0300")
        const {baseUrl, headers} = config;

        const data = {
            comment: reportText,
            started,
            timeSpentSeconds: scandTimeSpentSeconds,
        };

        /*
        GM_xmlhttpRequest({
            method: 'POST',
            url: baseUrl + BASE_PATH + ticketId + '/worklog',
            data,
            json: true,
            headers,
            onload: function(responseDetails) {
                if ( responseDetails.status == 201 ) {
                    GM_log('Sync was successful');
                }
                else if ( responseDetails.status == 400 ) {
                    GM_log('Input is invalid');
                }
                else { // responseDetails.status == 403
                    GM_log('The user does not have permission to add the worklog');
                }
            }
        });
        */
    }

    function deleteWorklogFromJira(config, ticketId, id) {
        const {baseUrl, headers} = config;

        /*
        GM_xmlhttpRequest({
            method: 'DELETE',
            url: baseUrl + BASE_PATH + ticketId + '/worklog/' + id,
            // json: true,
            headers,
            onload: function(responseDetails) {
                if ( responseDetails.status == 204 ) {
                    GM_log('Delete was successful');
                }
                else if (responseDetails.status == 400) {
                    GM_log('Input is invalid');
                }
                else { // responseDetails.status == 403
                    GM_log('The user does not have permission to delete the worklog');
                }
            }
        });
        */
    }


    const tables = document.getElementsByTagName('table');
    const lastTable = tables[tables.length - 1];
    const {rows} = lastTable;

    for (let i = 0; i < rows.length - 1; i++) {
        const row = rows[i];
        const actionTd = createActionTd();
        row.appendChild(actionTd);

        const {
            date,
            time,
            scandTimeSpentSeconds,
            description,
        } = getScandReportRowData(actionTd);

        const foundConfig = checkConfig(configs, description);
        if (foundConfig) {
            const {
                config,
                ticketId,
                reportText,
            } = foundConfig;
            const {headers, baseUrl} = config;

            GM_xmlhttpRequest({
                method: 'GET',
                url: baseUrl + BASE_PATH + ticketId + '/worklog',
                headers,
                onload: function(responseDetails) {
                    if ( responseDetails.status == 200 ) {
                        const respData = JSON.parse(responseDetails.responseText);
                        const {worklogs} = respData;
                        const matchedWorklog = matchWorklog({date, time, scandTimeSpentSeconds}, worklogs);

                        const btnText = matchedWorklog ? 'Delete&nbsp;report' : 'Sync&nbsp;report';
                        const newButton = createNewButton(btnText);
                        actionTd.appendChild(newButton);

                        newButton.addEventListener('click', (event) => {
                            event.stopPropagation();
                            event.preventDefault();

                            if (matchedWorklog) {
                                const {id} = matchedWorklog;
                                deleteWorklogFromJira(config, ticketId, id);
                            }
                            else {
                                const reportData = {date, time, scandTimeSpentSeconds, reportText};
                                syncWorklogInJira(config, reportData, ticketId);
                            }

                        });
                    }
                    else {
                        GM_log('JIRA issue information is not accessible for ' + ticketId);
                    }
                }
            });
        }
    }
})();
