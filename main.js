let VIDEO_LOCAL_DIRECTORY = "";
let DEST_PARENT_DIRECTORY = "";
let UPLOAD_URL = "";
let COUNT_OF_SYNC_TASKS = 5;
let API_KEY = "";

const fs = require("fs");
const unirest = require("unirest");
const readline = require("readline");
const { exit } = require("process");

const log = (...args) => {
    console.log(new Date(), ...args);
};

const files = [];
const failedTasks = [];

const getFiles = (address) => {
    const list = fs.readdirSync(address, { withFileTypes: true });
    for (const item of list) {
        if (item.isDirectory()) {
            getFiles(`${address}/${item.name}`);
        } else {
            files.push(`${address}/${item.name}`);
        }
    }
};

const upload = async (task) => {
    const { url, parentDirectory, file, index } = task;
    console.log(
        VIDEO_LOCAL_DIRECTORY,
        DEST_PARENT_DIRECTORY,
        UPLOAD_URL,
        COUNT_OF_SYNC_TASKS,
        API_KEY
    );
    log(`${index}/${files.length}`, "uploading " + file);
    var req = await unirest("POST", `${url}/task`)
        .headers({
            Authorization: API_KEY,
        })
        .attach("video", file)
        .field("parentDirectory", parentDirectory);
    log(file);
    console.log(req?.body || "Unexpected Error");
    if (!req?.body) {
        failedTasks.push(task);
    }
};

const input = () => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve, reject) => {
        rl.on("line", (line) => {
            rl.close();
            if (line === "") {
                reject("Enter something!");
            }
            resolve(line);
        });
    });
};

const main = async () => {
    // set config
    console.log("Haji!");
    try {
        console.log("enter local videos directory: ");
        VIDEO_LOCAL_DIRECTORY = await input();
        console.log("enter count of sync tasks: ");
        COUNT_OF_SYNC_TASKS = await input();
        console.log("enter encoder url with [https://encoder.example.com]: ");
        UPLOAD_URL = await input();
        console.log("enter your api key: ");
        API_KEY = await input();
    } catch (err) {
        console.log(err.message);
    }
    getFiles(VIDEO_LOCAL_DIRECTORY);
    // files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    let index = 1;
    const tasks = [];
    for (const file of files) {
        let path = file.split("/");
        path.pop();
        path = path.join("/");
        tasks.push({
            file: file,
            parentDirectory: path,
            url: UPLOAD_URL,
            index: index,
        });
        index++;
    }
    console.table(tasks);
    console.log("Do you want to continue ? [y/n]");
    const answer = await input();
    if (answer !== "y") {
        exit(1);
    }
    const promisesLength = Math.ceil(tasks.length / COUNT_OF_SYNC_TASKS);
    for (let i = 0; i < promisesLength; i++) {
        const startIndex = i * COUNT_OF_SYNC_TASKS;
        const endIndex =
            i !== promisesLength - 1
                ? (i + 1) * COUNT_OF_SYNC_TASKS
                : undefined;
        await Promise.all(
            tasks.slice(startIndex, endIndex).map((task) => upload(task))
        );
    }
    while (failedTasks.length > 0) {
        const task = failedTasks.pop();
        await upload(task);
    }
    log("all done");
};
main();
