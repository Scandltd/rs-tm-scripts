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
// ==/UserScript==

// const cookieNames = ['cloud.session.token', 'atlassian.xsrf.token'];

const configs = [
    {
        baseUrl: 'http://your_jira__domen/',
        idRegex: /^\((DEV-\d+)\)\s/,
        textRegex: /^\(DEV-\d+\)\s(.+)$/,
        token: btoa('your_jira_email:your_jira_token'),
        headers: null,
    }
];

function getNewButton(btnText) {
    const button = document.createElement("button");
    button.style.width = '100%';
    button.style.height = 'auto';
    button.style.cursor = 'pointer';
    button.style.backgroundColor = '#FFFFFF';
    button.innerHTML = btnText;
    return button;
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

(function() {
    'use strict';

    const frames = document.getElementsByTagName('frame');

    let matchedFrame;
    for (const frame of frames) {
        if (frame.name === 'pdetails') {
            matchedFrame = frame;
            break;
        }
    }

    if (matchedFrame) {
        matchedFrame.addEventListener('load', function() {
            const tables = matchedFrame.contentWindow.document.getElementsByTagName('table');
            const lastTable = tables[tables.length - 1];
            const {rows} = lastTable;

            for (let i = 0; i < rows.length - 1; i++) {
                const row = rows[i];
                const newTd = document.createElement("td");
                newTd.style.backgroundColor = '#FFFFFF';
                newTd.style.padding = 0;
                row.appendChild(newTd);

                const scandWorkLog = newTd.previousElementSibling.innerText;

                let checkedResult = null;
                const foundConfig = configs.find(config => {
                    checkedResult = config.idRegex.exec(scandWorkLog);
                    if (checkedResult) {
                        if (!config.headers) {
                            config.headers = getheaders(config.token);
                        }
                        return true;
                    }
                    return false;
                });

                if (foundConfig) {
                    const {headers, baseUrl, textRegex} = foundConfig;
                    const ticketId = checkedResult[1];
                    const reportText = textRegex.exec(scandWorkLog)[1];
                    console.log({ticketId});
                    console.log({reportText});

                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: baseUrl + 'rest/api/2/issue/' + ticketId + '/worklog',
                        headers: foundConfig.headers,
                        onload: function(responseDetails) {
                            if ( responseDetails.status == 200 ) {
                                const respData = JSON.parse(responseDetails.responseText);
                                const {worklogs} = respData;

                                const btnText = worklogs.length > 0 ? 'Delete&nbsp;report!' : 'Add&nbsp;report!';
                                const newButton = getNewButton(btnText);
                                newTd.appendChild(newButton);

                                newButton.addEventListener('click', (event) => {
                                    event.stopPropagation();
                                    event.preventDefault();

                                    GM_log(' ');
                                    GM_log({ticketId});
                                    GM_log({reportText});
                                    // GM_log({responseDetails});
                                    // GM_log(scandWorkLog);
                                    GM_log({worklogs: JSON.parse(responseDetails.responseText).worklogs});

                                    worklogs.forEach(worklog => {
                                        const {comment, started, timeSpent, timeSpentSeconds} = worklog;
                                        console.log({worklog: {comment, started, timeSpent, timeSpentSeconds}});
                                    });
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
