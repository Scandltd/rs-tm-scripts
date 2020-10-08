// ==UserScript==
// @name         Jira Helper Script
// @namespace    http://reports.scand/
// @version      0.0.1
// @description  Jira Helper Script
// @author       Aleksandr Baliunov <baliunov@scand.com>
// @match        http://reports.scand/ureports.php
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_cookie
// @grant        GM_log
// @grant        GM_registerMenuCommand
// @grant        GM_deleteValue
// ==/UserScript==


(function() {
    'use strict';

    const configs = [
        {
            baseUrl: 'https://route4gas.atlassian.net/',
            idRegex: /^\((DEV-\d+)\)\s/,
            textRegex: /^\(DEV-\d+\)\s(.+)$/,
            token: null,
            headers: null,
        }
    ];

    GM_registerMenuCommand('Change JIRA token', changeJiraToken);

    function changeJiraToken() {
        GM_setValue("rs2jira.jira.token", prompt("JIRA token", GM_getValue("rs2jira.jira.token", "some-jira-token-should-be-entered-here")));
    }

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

    function getReportRawData(actionTd) {
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
            hours,
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
            const {headers, baseUrl, textRegex} = foundConfig;
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
        const {comment, started, timeSpent, timeSpentSeconds} = worklog;
        const dateData = new Date(started);
        const day = dateData.getDate();
        const month = dateData.getMonth() + 1;
        const year = dateData.getFullYear();

        const hours = dateData.getHours();
        const minutes = dateData.getMinutes();
        const seconds = dateData.getSeconds();

        const formattedDate = `${padStart(day)}-${padStart(month)}-${year}`;
        const formattedTime = `${padStart(hours)}:${padStart(minutes)}:${padStart(seconds)}`;

        if (date === formattedDate && time === formattedTime && scandTimeSpentSeconds === timeSpentSeconds) {
            return true;
        }

        return false;
    });

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
            hours,
            scandTimeSpentSeconds,
            description,
        } = getReportRawData(actionTd);

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
                url: baseUrl + 'rest/api/2/issue/' + ticketId + '/worklog',
                headers: foundConfig.headers,
                onload: function(responseDetails) {
                    if ( responseDetails.status == 200 ) {
                        const respData = JSON.parse(responseDetails.responseText);
                        const {worklogs} = respData;

                        const matchedWorklog = matchWorklog({date, time, scandTimeSpentSeconds}, worklogs);
                        const btnText = matchedWorklog ? 'Delete&nbsp;report!' : 'Sync&nbsp;report!';

                        const newButton = createNewButton(btnText);
                        actionTd.appendChild(newButton);

                        newButton.addEventListener('click', (event) => {
                            event.stopPropagation();
                            event.preventDefault();

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
