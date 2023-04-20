import child_process from 'child_process';

namespace BuildUtils {
    const LOG_SPLIT_SEPARATOR: string = '||||||';

    const exec = (cmd: string): Promise<string> => {
        const promise: Promise<string> = new Promise((resolve: (value: string) => void) => {
            let result: string = '';
            const stream = child_process.exec(cmd);

            stream.stdout.on('data', data => {
                console.log('stdout: ' + data);
                result += data;
            });

            stream.stderr.on('data', data => console.error(`stderr: ${data}`));

            stream.on('close', (code) => {
                if (code !== 0) console.warn(`process exited with code ${code}`);
                resolve(result || "")
            });
        });
        return promise;
    }

    export const readGitVersion = async (dir: string): Promise<string> => {
        const commit = await exec(`cd ${dir} && git show -s --format=%H`);
        return commit.trim();
    }

    export const readGitLog = async (dir: string, startVersion: string,): Promise<{ name: string; title: string; }[]> => {
        let command = `cd ${dir} && `;
        command += startVersion ? `git log ${startVersion}.. ` : 'git log ';
        command += `--pretty=format:"%an${LOG_SPLIT_SEPARATOR}%s${LOG_SPLIT_SEPARATOR}%H" --no-merges`;
        const log = await exec(command);
        const logArray = log.split('\n');
        const messageArray: { name: string, title: string }[] = [];
        logArray.forEach((element: string) => {
            if (!element || !element.length) return;
            const data = element.split(LOG_SPLIT_SEPARATOR);
            if (!data || data.length !== 3) return;
            const [name, title, id] = data;
            messageArray.push({ name, title });
        })
        return messageArray;
    }
}
export default BuildUtils;