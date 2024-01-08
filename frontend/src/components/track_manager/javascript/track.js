import { useDebounceFn } from '@vueuse/core';
import { showAlert } from '../../../alerts';
import { api } from '../../../axiosInstance';
import { useAudioStore, useTracksFromDb } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import { availableSpace, getCookie, getSecureConfig } from '../../../sharedFunctions';

/* pinia stores */

const tracksFromDb = useTracksFromDb(pinia);
const audioStore = useAudioStore(pinia);

/*   track functions description

    deleteAllFilesFromDb – deletes all the uploaded tracks from the database
    deleteFileFromDb – deletes a single file from the database
    setReference – sets reference track
    updateAllMetadata – updates metadata for all the tracks
    updateMetadata – updates metadata for a single track

*/

function updateMetadata(obj) {
    const data = {
        filename: obj.filename,
        year: obj.year,
        performer: obj.performer,
        origin: obj.origin,
    };
    return api.put('/update-metadata', data, getSecureConfig());
}

const updateAllMetadata = useDebounceFn(() => {
    let metadata = [];
    for (let i = 0; i < tracksFromDb.trackObjects.length; i++) {
        metadata.push(updateMetadata(tracksFromDb.trackObjects[i]));
    }
    Promise.all(metadata).then(() => {
        showAlert('Metadata sucessfully updated.', 1500);
    });
}, 1000);

function setReference(filename) {
    tracksFromDb.setReference(filename);
    const data = {
        filename: filename,
        state: tracksFromDb.getObject(filename).reference,
    };
    api.put('/select-reference', data, getSecureConfig()).then(() => {
        if (tracksFromDb.getObject(filename).reference) {
            showAlert(`Selected reference: ${filename}`, 1500);
        } else {
            showAlert(`Deselected reference: ${filename}`, 1500);
        }
    });
}

async function deleteFileFromDb(filename) {
    const axiosConfig = {
        headers: {
            'X-CSRF-TOKEN': getCookie('csrf_access_token'),
        },
        data: { data: filename },
    };
    return api.delete('/delete-from-db', axiosConfig).then(() => {
        showAlert('Successfully deleted file: ' + filename, 1500);
        tracksFromDb.remove(filename);
        audioStore.remove(filename);
        availableSpace();
    });
}

function deleteAllFilesFromDb() {
    api.delete('/delete-all-from-db', getSecureConfig()).then(() => {
        showAlert('Successfully deleted all files.', 1500);
        audioStore.removeAll();
        tracksFromDb.removeAll();
        availableSpace();
    });
}

export { deleteAllFilesFromDb, deleteFileFromDb, setReference, updateAllMetadata };
