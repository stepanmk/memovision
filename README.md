# MemoVision

Official repository for the MemoVision software. 
Note that this repository is far from finished or comprehensive and will be updated soon (November 8, 2023). The code has not yet been refactored or adequately commented.

MemoVision software aims to provide an interface for comparative performance music analysis. This includes music information retrieval and feature selection methods. The frontend is developed with the Vue.js framework and communicates with the Python backend server built with Flask. JavaScript allows the interface to update dynamically and provides modern visuals together with Tailwind CSS. The Python backend leverages the open-source music feature extraction modules and deep learning implementations that are already available.

## Current state

Keep in mind that this is a work in progress and you may experience bugs, and optimization problems. The first official version should be released in January 2024. More information will be added soon.

Modules: 
- Track manager
- Region selector
- Interpretation player
- Visualization

Progress:
- [x] User interface via a web browser, logging, and 
- [x] Allows uploading of music recordings (different versions of the same piece), ground-truth annotations (measure/downbeat positions), binary labels, and metadata (performer names and year of recordings)
- [x] Parameter extraction: dynamics (RMS and loudness based on EBU R 128), timing (measure durations, tempo of measures), and beat activation function from the TCN model
- [x] Processing: tuning deviation estimation, chroma features, duplicate finder, structural differences detection, audio-to-audio synchronization (combined approach: MrMsDTW and activation function from TCN beat tracker)
- [x] Feature selection: Max-Relevance method on the duration of measures to rank each measure based on its relevance to given binary labels, ranking of measure relevance
- [x] Playback of synchronized tracks, easy piece-wise orientation, colorbar of selected relevance, detecting the structural differences in performances (such as missing or additional measures and repetitions)
- [x] Visualization: Plotting of performance parameters of any sections of interest (both individual plots and comparative plots with measures as x-axis), statistical scatter plot based on binary labels
- [ ] Piano roll: automatic transcription to MIDI piano roll (bytedance-based), onset positions and their distribution (available only for piano recordings), IOI plots

## License

So far, we suppose the MIT License or other open license that reflects all packages we used.

## How to install

For the development, we use the VSCode IDE and the instructions reflect it. If you use other IDEs, please, 

* Install Node.js and pnpm
  * download and install Node.js: https://nodejs.org/en/download/
  * run `npm install -g pnpm`
* Create a new Python virtual env `memovision` in, e.g., `C:/python-venv/memovision`
  * note: it should be Python 3.7.x or Python 3.8.x due to some dependencies (it was not tested on newer versions)
  * install backend Python modules (cd to backend folder): `pip install -r requirements.txt`
* Install the PostgreSQL database and create a new DB called `memovision`
* The list of the VSCode extensions we use is listed in `vscode_extentions.txt`.

* Navigate to the frontend folder: `cd frontend`
* Run `pnpm i` to install Node.js modules
* For the DB to run properly, you have to adjust the `backend/mos_backend/__init__.py` script for the correct DB URI (provide the password for the PostgreSQL user)
* You also need to adjust the `.vsode/tasks.json` file and provide a path to your Python virtual env and run.py in the project folder such as: `"command": "cd backend; & c:/python-venv/memovision/Scripts/python.exe C:/memovision/backend/run.py"`
* Then, run the `create_tables.py` script that creates tables for the `memovision` database.
* Furthermore, you need to download ffmpeg (https://ffmpeg.org/download.html) and waveform (https://github.com/bbc/audiowaveform/releases) and add them to your sys path. FFmpeg loads the non-wav files and waveform renders the waveforms of audio recordings in the browser.
* Reset the VSCode session for changes to take place. The `.vscode/tasks.json` file automatically runs Flask and Vite dev servers after the start of VSCode if all paths are provided correctly.

### Presentation
The methodology, some technical descriptions, and first visual examples were presented at the Second International Workshop on Multilayer Music Representation and Processing (MMRP23), a satellite event of the 4th International Symposium on the Internet of Sounds (IS2), and at the late-breaking demo section of the International Society of Music Information Retrieval (ISMIR23) conference.
 
### Acknowledgment
This work was supported by the project TA ČR, TL05000527 Memories of Sound: The Evolution of the Interpretative Tradition
Based on the Works of Antonin Dvorak and Bedrich Smetana and was co-financed with state support of the Technology Agency
of the Czech Republic within the ÉTA Program.
