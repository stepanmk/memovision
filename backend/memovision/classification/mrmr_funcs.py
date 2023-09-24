from sklearn.feature_selection import f_classif as sklearn_f_classif
from joblib import Parallel, delayed
from multiprocessing import cpu_count
import pandas as pd
import numpy as np


# these functions are derived from mrmr-selection package
def parallel_df(func, df, series, n_jobs):
    n_jobs = min(cpu_count(), len(df.columns)) if n_jobs == -1 else min(cpu_count(), n_jobs)
    col_chunks = np.array_split(range(len(df.columns)), n_jobs)
    lst = Parallel(n_jobs=n_jobs)(delayed(func)(df.iloc[:, col_chunk], series) for col_chunk in col_chunks)
    return pd.concat(lst)


def f_classif(X, y, n_jobs):
    return parallel_df(_f_classif, X, y, n_jobs=n_jobs)


def _f_classif_series(x, y):
    x_not_na = ~ x.isna()
    if x_not_na.sum() == 0:
        return 0
    return sklearn_f_classif(x[x_not_na].to_frame(), y[x_not_na])[0][0]


def _f_classif(X, y):
    return X.apply(lambda col: _f_classif_series(col, y)).fillna(0.0)
