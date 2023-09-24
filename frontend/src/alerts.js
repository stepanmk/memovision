import { useAlertState } from './globalStores'

let globalTimer;

function openAlert(message)
{
    const alertState = useAlertState();
    alertState.message = message;
    alertState.show = true;
}

function closeAlert()
{
    const alertState = useAlertState();
    alertState.show = false;
    alertState.message = '';
}

export function showAlert(message, duration)
{
    openAlert(message);
    clearTimeout(globalTimer);
    globalTimer = setTimeout(closeAlert, duration);
}