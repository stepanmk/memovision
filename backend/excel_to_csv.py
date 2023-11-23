import os

import pandas as pd

metadata_path = './metadata/metadata/xlsx/'
csv_path = './metadata/metadata/csv/'
metadata_files = os.listdir(metadata_path)


def save_as_csv(files, out_path):
    for file in files:
        path = f'{metadata_path}{file}'
        df = pd.read_excel(path,
                           keep_default_na=False,
                           index_col=0,
                           header=None,
                           names=['filename', 'performer', 'year'])
        df.to_excel(path)
        csv_path = f'{out_path}{file[:-5]}.csv'
        df.to_csv(csv_path, encoding='utf-8-sig')


save_as_csv(metadata_files, csv_path)
