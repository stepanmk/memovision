import { defineStore } from 'pinia'


export const useUserInfo = defineStore('userInfo', 
{
    state: () => ({ 
        username: '',
        sessions: [],
        preciseSync: null,
        selectedSession: null,
        darkModeEnabled: false
    }),
})

export const useAlertState = defineStore('alertState', 
{
    state: () => ({ 
        show: false,
        message: ''
    }),
})

export const useModulesVisible = defineStore('modulesVisible', 
{
    state: () => ({ 
        trackManager: true,
        regionSelector: false,
        interpretationPlayer: false,
        featureVisualizer: false
    }),
    actions: {
        hideAllModules() {
          this.trackManager = false;
          this.regionSelector = false;
          this.interpretationPlayer = false,
          this.featureVisualizer = false;
        },
    },
})

export const useComponentsVisible = defineStore('componentsVisible', 
{
    state: () => ({ 
        sidenav: false,
        tracklist: false
    }),
})

export const useAnalysisState = defineStore('analysisState',
{
    state: () =>({
        individualAnalysis: true,
        batchAnalysis: false,
        multiSelectEnabled: false,
        multiSelectActive: false
    })
})

export const useTracksFromDb = defineStore('tracksFromDb', 
{
    state: () => ({ 
        trackObjects: [],
        selected: []
    }),
    getters: {
        somethingUploaded: state => state.trackObjects.length > 0,
        nonSyncTracks: state => state.trackObjects.filter(obj => !obj.sync),
        syncTracks: state => state.trackObjects.filter(obj => obj.sync),
        refTrackSelected: state => state.trackObjects.filter(obj => obj.reference).length > 0,
        refTrack: state => state.trackObjects.find(obj => obj.reference),
        restOfTracks: state => state.trackObjects.filter(obj => !obj.reference),
        allTracksHaveMeasures: state => (state.trackObjects.filter(obj => obj.gt_measures || obj.tf_measures).length === state.trackObjects.length) &&
        (state.trackObjects.length > 0),
        somethingToSync() { return this.nonSyncTracks.length > 0 },
        refTrackSync() { return this.syncTracks.filter(obj => obj.reference).length > 0},
    },
    actions: {
        getIdx(filename)
        {
            return this.trackObjects.findIndex(obj => obj.filename === filename);
        },
        getObject(filename)
        {
            return this.trackObjects.find(obj => obj.filename === filename);
        },
        filenameExists(filename)
        {
            return this.trackObjects.some(obj => obj.filename === filename) ? true : false;
        },
        sortByName() 
        {
            this.trackObjects.sort((a, b) => a.filename.localeCompare(b.filename));
        },
        addTrackData(obj)
        {
            this.trackObjects.push(obj);
            this.sortByName();
            const idx = this.getIdx(obj.filename);
            this.selected.splice(idx, 0, false);
        },
        setGtMeasures(filename, state)
        {
            const idx = this.getIdx(filename);
            this.trackObjects[idx].gt_measures = state;
        },
        setTfMeasures(filename, state)
        {
            const idx = this.getIdx(filename);
            this.trackObjects[idx].tf_measures = state;
        },
        setReference(filename)
        {
            const idx = this.getIdx(filename);
            this.trackObjects[idx].reference = !this.trackObjects[idx].reference;
            this.trackObjects[idx].label = !this.trackObjects[idx].label;
            this.trackObjects.forEach((obj) => {
                if (obj.filename !== filename) 
                {
                    obj.reference = false;
                    obj.label = false;
                }
            });
        },
        remove(filename)
        {
            const idx = this.getIdx(filename);
            this.trackObjects.splice(idx, 1);
            this.selected.splice(idx, 1);
        },
        removeAll()
        {
            this.trackObjects.splice(0);
            this.selected.splice(0);
        },
    }
})

export const useMeasureData = defineStore('measureData', 
{
    state: () => ({ 
        measureObjects: [],
        relevanceFeatures: [],
        relevance: {},
        labels: []
    }),
    getters: {
        refTrack: state => state.measureObjects.find(obj => obj.reference),
        restOfTracks: state => state.measureObjects.filter(obj => !obj.reference),
    },
    actions: {
        getIdx(filename)
        {
            return this.measureObjects.findIndex(obj => obj.filename === filename);
        },
        getObject(filename)
        {
            return this.measureObjects.find(obj => obj.filename === filename);
        },
        getReferenceObject()
        {
            return this.measureObjects.find(obj => obj.reference);
        },
        sortByName()
        {
            this.measureObjects.sort((a, b) => a.filename.localeCompare(b.filename));
        },
        // getRegionRelevance(startIdx, endIdx)
        // {
        //     let sortedRelevance = this.relevanceObjects.slice(startIdx, endIdx);
        //     sortedRelevance.sort((a, b) => a.relevance - b.relevance).reverse();
        //     return sortedRelevance;
        // },
        // getTopRelevance(n)
        // {
        //     let sortedRelevance = this.relevanceObjects.slice();
        //     sortedRelevance.sort((a, b) => a.relevance - b.relevance).reverse();
        //     return sortedRelevance.slice(0, n);
        // },
        addTrackData(obj)
        {
            this.measureObjects.push(obj);
            this.sortByName();
            const idx = this.getIdx(obj.filename);
            this.selected.splice(idx, 0, false);
        },
        remove(filename)
        {
            const idx = this.getIdx(filename);
            this.measureObjects.splice(idx, 1);
            this.selected.splice(idx, 1);
        },
        removeAll()
        {
            this.measureObjects.splice(0);
            this.selected.splice(0);
        },
        filenameExists(filename)
        {
            return this.measureObjects.some(obj => obj.filename === filename) ? true : false;
        }
    }
})

export const useAudioStore = defineStore('audioStore', 
{
    state: () => ({ 
        audioObjects: [],
        metronomeClick: null,
    }),
    actions: {
        getIdx(filename)
        {
            return this.audioObjects.findIndex(x => x.filename === filename);
        },
        sortByName() 
        {
            this.audioObjects.sort((a, b) => a.filename.localeCompare(b.filename));
        },
        getAudio(filename)
        {
            const idx = this.getIdx(filename);
            return this.audioObjects[idx].audio;
        },
        getWaveformData(filename)
        {   
            const idx = this.getIdx(filename);
            return this.audioObjects[idx].waveformData;
        },
        remove(filename)
        {
            const idx = this.getIdx(filename);
            this.audioObjects.splice(idx, 1);
        },
        removeAll()
        {
            this.audioObjects.splice(0);
        }
    }
})

export const useFeatureLists = defineStore('featureLists', 
{
    state: () => ({ 
        dynamics: [],
        rhythm: []
    }),
})

export const useFeatureData = defineStore('featureData', 
{
    state: () => ({
        dynamics: {},
        rhythm: {}
    })
})