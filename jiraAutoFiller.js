// ==UserScript==
// @name         Jira Auto Filler
// @namespace    http://reports.scand/
// @version      0.0.1
// @description  try to take over the world!
// @author       You
// @match        http://reports.scand/projects.php
// @match        http://reports.scand/userframes.php
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_cookie
// @grant        GM_log
// @grant        GM_registerMenuCommand
// @grant        GM_deleteValue
// ==/UserScript==

// const cookieNames = ['cloud.session.token', 'atlassian.xsrf.token'];

const formatNumber = (number) => number < 10 ? `0${number}` : `${number}`;

function changeJiraToken(baseUrl) {
    if (!baseUrl) {
        const config = configs.find(config => !config.token);
        if (config) {
            ({baseUrl} = config);
        }
        else {
            ({baseUrl} = configs[0]);
        }
    }
    GM_setValue("jira.token", prompt("JIRA token for " + baseUrl, GM_getValue("jira.token", "some-jira-token-should-be-entered-here")));
}

const configs = [
    {
        baseUrl: 'http://your_jira__domen/',
        idRegex: /^\((DEV-\d+)\)\s/,
        textRegex: /^\(DEV-\d+\)\s(.+)$/,
        token: null,
        headers: null,
    }
];

function matchFrame() {
    const frames = document.getElementsByTagName('frame');

    let matchedFrame;
    for (const frame of frames) {
        if (frame.name === 'pdetails') {
            return frame;
        }
    }
}

function getNewButton(btnText) {
    const button = document.createElement("button");
    button.style.width = '100%';
    button.style.height = 'auto';
    button.style.cursor = 'pointer';
    button.style.backgroundColor = '#FFFFFF';
    button.innerHTML = btnText;
    return button;
}

function getActiveTd() {
    const activeTd = document.createElement("td");
    activeTd.style.backgroundColor = '#FFFFFF';
    activeTd.style.padding = 0;
    return activeTd;
}

function getheaders(token) {
    // Code with cookies works only in firefox
    // If you use cookies, you need to add the record @match http://your_jira__domen/ on the script's head
    // In chrome need to use Basic Authorization
    /*
    const jiraCookiesData = {};
    let cookieStr = '';

    GM_cookie('list', { url: 'http://your_jira__domen/' }, function(cookies, error) {
        if (error) {
            GM_log({error});
        }
        else {
            cookies.filter(cookie => cookieNames.includes(cookie.name)).forEach(cookie => jiraCookiesData[cookie.name] = cookie.value);
            cookieStr = cookieNames.map(name => name + '=' + jiraCookiesData[name] + ';').join(' ');
        }
    });
    */

    return {
        'Authorization': 'Basic ' + token,
        'Content-Type': 'application/json',
        'X-Atlassian-Token': 'nocache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Alow-Methods': 'POST, GET, PUT, OPTIONS, DELETE',
        'Access-Control-Max-Age': '3600',
        'Access-Control-Allow-Headers': 'x-requested-with, content-type',
        // cookie: cookieStr,
    };
}

function getRawData(activeTd) {
    const descriptionTd = activeTd.previousElementSibling;
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
                while (!(config.token = GM_getValue("jira.token", null))) {
                    changeJiraToken(config.baseUrl);
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

    const formattedDate = `${formatNumber(day)}-${formatNumber(month)}-${year}`;
    const formattedTime = `${formatNumber(hours)}:${formatNumber(minutes)}:${formatNumber(seconds)}`;

    if (date === formattedDate && time === formattedTime && scandTimeSpentSeconds === timeSpentSeconds) {
        return true;
    }

    return false;
});


(function() {
    'use strict';

    GM_registerMenuCommand('Change JIRA token', changeJiraToken);

    const matchedFrame = matchFrame();

    if (matchedFrame) {
        matchedFrame.addEventListener('load', function() {
            const tables = matchedFrame.contentWindow.document.getElementsByTagName('table');
            const lastTable = tables[tables.length - 1];
            const {rows} = lastTable;

            for (let i = 0; i < rows.length - 1; i++) {
                const row = rows[i];
                const activeTd = getActiveTd();
                row.appendChild(activeTd);

                const {
                    date,
                    time,
                    hours,
                    scandTimeSpentSeconds,
                    description,
                } = getRawData(activeTd);

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

                                const newButton = getNewButton(btnText);
                                activeTd.appendChild(newButton);

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
        });
    }
})();
