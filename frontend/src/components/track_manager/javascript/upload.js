import { showAlert } from '../../../alerts';
import { api } from '../../../axiosInstance';
import { useTracksFromDb, useUserInfo } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import { availableSpace, getCookie, getSecureConfig } from '../../../sharedFunctions';
import { getAudioData, getMeasureData, getTrackData } from './fetch';
import { transferAllMeasures } from './process';
import { somethingToUpload, uploadList } from './variables';

/* pinia stores */

const tracksFromDb = useTracksFromDb(pinia);
const userInfo = useUserInfo(pinia);

/*  upload functions description 
    
    addFilesToUploadList – adds files to the upload list
    clearUploadList – removes all files from the upload list
    preUploadCheck – returns true if the file with a given filename is already uploaded
    removeFileFromUploadList – removes file from the upload list
    uploadAllFiles – uploads all the files from the upload list
    uploadMeasures – uploads manual measure annotations
    uploadMetadata – uploads metadata to the server
    uploadOneFile – uploads one file to the server

*/

async function preUploadCheck(filename) {
    const data = {
        filename: filename,
    };
    const res = await api.post('/pre-upload-check', data, getSecureConfig());
    return res.data.exists;
}

async function addFilesToUploadList(files) {
    if (!files) {
        files = document.getElementById('added-files').files;
    }
    for (let i = 0; i < files.length; i++) {
        const fileAlreadyInList = uploadList.value.find((obj) => obj.filename === files[i].name);
        const fileAlreadyUploaded = await preUploadCheck(files[i].name);
        if (!fileAlreadyInList && !fileAlreadyUploaded) {
            uploadList.value.push({
                file: files[i],
                filename: files[i].name,
                beingUploaded: false,
                beingConverted: false,
                progressPercentage: 0,
            });
        }
    }
}

function removeFileFromUploadList(filename) {
    const idx = uploadList.value.findIndex((obj) => obj.filename === filename);
    uploadList.value.splice(idx, 1);
}

function clearUploadList() {
    for (let i = 0; i < uploadList.value.length; i++) {
        if (!uploadList.value[i].beingUploaded) {
            uploadList.value.splice(i, 1);
            i -= 1;
        }
    }
}

async function uploadOneFile(fileObject) {
    if (!fileObject.beingUploaded) {
        fileObject.beingUploaded = true;
        let formData = new FormData();
        formData.append('file', fileObject.file);
        formData.append('availableSpace', userInfo.availableSpace);
        function fileUploadProgress(event) {
            const percentage = Math.round((100 * event.loaded) / event.total);
            fileObject.progressPercentage = percentage;
            if (percentage === 100) fileObject.beingConverted = true;
        }
        const axiosConfig = {
            headers: {
                'X-CSRF-TOKEN': getCookie('csrf_access_token'),
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: fileUploadProgress,
        };
        const res = await api.post('/upload-audio-file', formData, axiosConfig);
        removeFileFromUploadList(fileObject.file.name);
        // add track to the store and fetch audio with waveform
        tracksFromDb.addTrackData(res.data.obj);
        await getAudioData(res.data.obj.filename);
        await availableSpace();
    }
}

function uploadAllFiles() {
    const uploads = [];
    if (somethingToUpload) {
        for (let i = 0; i < uploadList.value.length; i++) {
            uploads.push(uploadOneFile(uploadList.value[i]));
        }
    }
    Promise.all(uploads).then(() => {
        api.put('/check-labels', {}, getSecureConfig());
    });
}

async function uploadMeasures(filename, id) {
    const measures = document.getElementById(`measures-${id}`).files[0];
    let formData = new FormData();
    formData.append('file', measures);
    formData.append('filename', filename);
    // axios request config
    const axiosConfig = {
        headers: {
            'X-CSRF-TOKEN': getCookie('csrf_access_token'),
            'Content-Type': 'multipart/form-data',
        },
    };
    await api.post('/upload-measures', formData, axiosConfig);
    tracksFromDb.setGtMeasures(filename, true);
    showAlert(`Uploaded measures for track: ${filename}`, 1500);
    if (!tracksFromDb.somethingToSync) {
        transferAllMeasures().then(() => {
            getMeasureData();
        });
    }
}

async function uploadMetadata() {
    const metadata = document.getElementById('upload-metadata').files[0];
    let formData = new FormData();
    formData.append('file', metadata);
    // axios request config
    const axiosConfig = {
        headers: {
            'X-CSRF-TOKEN': getCookie('csrf_access_token'),
            'Content-Type': 'multipart/form-data',
        },
    };
    await api.post('/upload-metadata', formData, axiosConfig);
    await getTrackData();
    showAlert('Successfully uploaded metadata.', 1500);
}

export {
    addFilesToUploadList,
    clearUploadList,
    removeFileFromUploadList,
    uploadAllFiles,
    uploadMeasures,
    uploadMetadata,
};
