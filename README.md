# MemoVision

Official repository for the MemoVision software.

MemoVision software aims to provide an interface for comparative performance music analysis. This includes music information retrieval and feature selection methods. The frontend is developed with the Vue.js framework and communicates with the Python backend server built with Flask. JavaScript allows the interface to update dynamically and provides modern visuals. The backend leverages the open-source music feature extraction modules and deep learning implementations that are already available.

## Current state

Keep in mind that this is a work in progress. First official version should be released in January 2024.

Modules: 
- Track manager
- Section selector
- Interpretation player
- Visualization

Progress:
- [x] User interface via a web browser
- [x] Allows uploading of music recordings (different versions of the same piece), ground-truth annotations (measure/downbeat positions), and binary labels
- [x] Parameter extraction: dynamics (RMS and loudness based on EBU R 128) and timing (measure durations, tempo of measures)
- [x] Processing: tuning deviation estimation, chroma features, duplicate finder, structural differences detection, audio-to-audio synchronization (combined approach: MrMsDTW and activation function from TCN beat tracker)
- [x] Feature selection: Max-Relevance method on the duration of measures to rank each measure based on its relevance to given binary labels
- [x] Playback of synchronized tracks, easy piece-wise orientation, colorbar of selected relevance
- [ ] Visualization: Plotting of performance parameters of any sections of interest
- [ ] Piano roll: automatic transcription to MIDI piano roll, onset positions and distribution (available only for piano recordings)
  
### Acknowledgment

This work was supported by the project TA ČR, TL05000527 Memories of Sound: The Evolution of the Interpretative Tradition
Based on the Works of Antonin Dvorak and Bedrich Smetana and was co-financed with state support of the Technology Agency
of the Czech Republic within the ÉTA Program.
