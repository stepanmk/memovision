import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from mrmr import mrmr_classif
from glob import glob
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from sklearn.svm import NuSVC, LinearSVC
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score

import functools
from memovision.classification.mrmr_funcs import f_classif


def load_df(data_path: str, labels: list):
    """
    Load data matrices and refactor them.

    Args:
        data_path (str):    path to the data matrix

    Returns:
        df_nonscaled        dataframe of non-scaled values
        df_scaled           dataframe of scaled values
        df_labels           dataseries of labels
    """

    df_nonscaled = pd.read_csv(f'{data_path}/nonscaled.csv')
    # filenames = df_nonscaled.iloc[:, 0].values
    df_nonscaled = df_nonscaled.iloc[:, 1:]
    df_scaled = pd.read_csv(f'{data_path}/scaled.csv').iloc[:, 1:]

    df_labels = pd.Series(labels)
    df_bool = df_labels.notna().values

    df_nonscaled = df_nonscaled.loc[df_bool, :]
    df_scaled = df_scaled.loc[df_bool, :]
    df_labels.dropna(inplace=True)

    df_labels.index = range(1, len(df_labels) + 1)
    df_scaled.index = range(1, len(df_scaled.index) + 1)
    df_nonscaled.index = range(1, len(df_nonscaled.index) + 1)

    return df_nonscaled, df_scaled, df_labels


def preprocess_duration_matrix(sync_files: list,
                               sync_filenames: list,
                               data_path: str,
                               scenario: str = 'all_measures'):
    """
    Preprocess measure positions and save the resulting data matrices (scaled and non-scaled).

    Args:
        sync_measures_path (str):   path to the folder with sync measures
        data_path (str):            path to the folder with data
        scenario (str):             name of the scenario (such as all_measures)

    Returns:

    """
    data_nonscaled = []
    # process sync measures and create data matrices depending on the scenario
    if scenario == 'all_measures':
        for i, file in enumerate(sync_files):
            with open(file, 'r') as f:
                loaded_measures = [line.rstrip() for line in f]
            loaded_measures = list(map(float, loaded_measures))
            diff_time = [y - x for x, y in zip(loaded_measures[:-1], loaded_measures[1:])]
            data_nonscaled.append(diff_time)
        x_measures = np.arange(1, len(loaded_measures), 1, dtype=int)

    # todo: do we need scaled data here or scale them afterwards?
    scaler = StandardScaler(with_mean=True, with_std=True)
    x = scaler.fit_transform(np.array(data_nonscaled))
    columns = ['measure' + str(x) for x in range(1, len(x_measures) + 1)]

    # save the data matrices
    df_scaled = pd.DataFrame(x, index=sync_filenames, columns=columns)
    df_nonscaled = pd.DataFrame(np.array(data_nonscaled), index=sync_filenames, columns=columns)
    df_scaled.to_csv(f'{data_path}/scaled.csv', encoding='utf-8', index=True)
    df_scaled.to_excel(f'{data_path}/scaled.xlsx', encoding='utf-8', index=True)
    df_nonscaled.to_csv(f'{data_path}/nonscaled.csv', encoding='utf-8', index=True)


def save_duration_relevance(df_data: pd.DataFrame = None,
                           df_labels: pd.Series = None,
                           mr_path: str = 'MR_features',
                           label: str = 'label'):
    relevance = relevance_computation(df_data=df_data, df_labels=df_labels)
    df_relevance = pd.DataFrame(relevance, columns=['relevance'])  
    df_relevance.to_csv(f'{mr_path}/{label}.csv')


def relevance_computation(df_data: pd.DataFrame,
                          df_labels: pd.Series,
                          n_jobs: int = 1) -> pd.Series:
    """
    Compute relevance based on mrmr-selection package.

    Args:
        df_data (pd.DataFrame):     data matrix
        df_labels (pd.Series):      corresponding labels
        n_jobs (int):               n of jobs for parallelization

    Returns:
        pd.Series of pairs (feature, relevance)
    """
    relevance_func = functools.partial(f_classif, n_jobs=n_jobs)
    relevance = relevance_func(**{'X': df_data, 'y': df_labels})
    # features = relevance[relevance.fillna(0) > 0].index.to_list()
    return relevance


def get_labels(path_to_labels: str,
               filenames: list,
               label: str = 'label'):
    """
    Get and refactor the labels of all filenames.

    Args:
        path_to_labels:         path to the label file (not folder)
        filenames:              filenames of files used
        label:                  name of the label

    Returns:
        labels (pd.Series):     pd.Series of given labels

    """

    # todo: change the path to the labels so it loads the labels from database
    df_labels = pd.read_csv(f'{path_to_labels}')
    df_labels = df_labels.iloc[np.where(df_labels.filename.isin(filenames))]
    labels = df_labels[f'{label}'].astype(float).squeeze()

    return labels

