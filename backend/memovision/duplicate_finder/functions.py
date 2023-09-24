import numpy as np
import imagehash
import matplotlib.pyplot as plt
from PIL import Image


def save_chromaImage(chroma_path, output_image):
    chroma = np.load(chroma_path)
    chromaprocessed = (chroma * 256).astype(np.uint8)
    im = Image.fromarray(chromaprocessed)
    if im.mode != 'RGB':
        im = im.convert('RGB')
    im.save(output_image)


def find_nearest(array, value):
    index = np.abs(array - value).argmin()
    return array.flat[index]


def compute_slope(x1, y1, x2, y2):
    return (y2 - y1) / (x2 - x1)


def verify_path_slope(warping_path, segmentdivider, pair_names, diff_max=3, area_diff=10, diff_min=0.13,
                      feature_rate=50, plotting=True, debug=False):
    pathx = np.array(warping_path[0, :])
    pathy = np.array(warping_path[1, :])

    pathxminval = min(pathx)
    pathxmaxval = max(pathx)
    pathxvalrange = pathxmaxval - pathxminval

    modulo = pathxvalrange % segmentdivider
    pathxvalrange = pathxvalrange - modulo

    refpoint1xval = int(pathxminval + (pathxvalrange / segmentdivider))
    refpoint2xval = int(pathxminval + (pathxvalrange / segmentdivider) * (segmentdivider - 1))
    refpoint1xpos = int(np.argwhere(pathx == refpoint1xval)[0])
    refpoint2xpos = int(np.argwhere(pathx == refpoint2xval)[0])

    if debug:
        print(f'Point x start: {refpoint1xval} and x end: {refpoint2xval}')

    refpointsx = np.array([pathx[refpoint1xpos], pathx[refpoint2xpos]])
    refpointsy = np.array([pathy[refpoint1xpos], pathy[refpoint2xpos]])

    # Line approximation
    coefficients = np.polyfit(refpointsx, refpointsy, 1)
    polynomial = np.poly1d(coefficients)

    linex = np.arange(start=0, stop=len(pathx), step=1)
    liney = polynomial(linex)

    testpointsnum = int((refpoint2xval - refpoint1xval) / 100)  # one point in cca 3 seconds cuz 50 fps
    if debug:
        print(f'No of testpoints: {testpointsnum}')

    refpointsvaldiff = refpoint2xval - refpoint1xval

    ref_slope = compute_slope(refpoint1xval, refpoint1xpos, refpoint2xval, refpoint2xpos)
    if debug:
        print(f'Ref_slope: {ref_slope}')

    if testpointsnum > refpointsvaldiff:
        testpointsnum = refpointsvaldiff - 1
    testpointstep = refpointsvaldiff / testpointsnum  # step size

    # Testing of points
    testpointxshift = testpointstep / 2
    list_of_x_points = []
    list_of_y_points = []
    list_of_slopes = []
    wrong_x_points = []
    wrong_y_points = []

    if plotting:
        plt.figure()

    is_same = True
    for i in range(0, testpointsnum, 1):  # cycle iterating across individual testing points
        if list_of_x_points:
            previous_x_testpoint = list_of_x_points[-1]
            previous_y_testpoint = list_of_y_points[-1]

            testpointxval = refpoint1xval + i * testpointstep + testpointxshift  # finding the value for testing
            testpointnearestxval = find_nearest(pathx, testpointxval)  # finding the nearest value to the test value
            testpointxpos = np.argwhere(pathx == testpointnearestxval)[0]
            pathval = float(pathy[testpointxpos])  # finding the value that matches the index found in the previous step
            current_slope = compute_slope(previous_x_testpoint, previous_y_testpoint, testpointnearestxval, pathval)
            list_of_slopes.append(current_slope)
            list_of_x_points.append(testpointnearestxval)
            list_of_y_points.append(pathval)

            if plotting:
                if abs(current_slope - ref_slope) > diff_max or current_slope <= diff_min:
                    plt.plot(testpointnearestxval, pathval, '+', markersize=12, color='red')
                else:
                    plt.plot(testpointnearestxval, pathval, '+', markersize=12, color='green')

            if abs(current_slope - ref_slope) > diff_max or current_slope <= diff_min:
                is_same = False
                # need to check if this is correct
                if wrong_x_points and wrong_y_points:
                    if (testpointnearestxval / feature_rate) - (previous_x_testpoint / feature_rate) > area_diff \
                            or (pathval / feature_rate) - (previous_y_testpoint / feature_rate) > area_diff:
                        wrong_x_points.append(previous_x_testpoint / feature_rate)
                        wrong_y_points.append(previous_y_testpoint / feature_rate)
                        wrong_x_points.append(testpointnearestxval / feature_rate)
                        wrong_y_points.append(pathval / feature_rate)
                    else:
                        wrong_x_points.append(testpointnearestxval / feature_rate)
                        wrong_y_points.append(pathval / feature_rate)
                else:
                    wrong_x_points.append(previous_x_testpoint / feature_rate)
                    wrong_y_points.append(previous_y_testpoint / feature_rate)
                    wrong_x_points.append(testpointnearestxval / feature_rate)
                    wrong_y_points.append(pathval / feature_rate)

        else:
            testpointxval = refpoint1xval + i * testpointstep + testpointxshift  # finding the value for testing
            testpointnearestxval = find_nearest(pathx, testpointxval)  # finding the nearest value to the test value
            testpointxpos = np.argwhere(pathx == testpointnearestxval)[0]
            pathval = float(pathy[testpointxpos])  # finding the value that matches the index found in the previous step

            list_of_x_points.append(testpointnearestxval)
            list_of_y_points.append(pathval)

    result_max = max(list_of_slopes)
    result_min = min(list_of_slopes)

    if debug:
        print(f'Result_max: {result_max}')
        print(f'Result_min: {result_min}')

    # print(f'////////////////// wrong points')
    # print(wrong_x_points)
    # print(wrong_y_points)
    #
    # ref_x_points_table = [True]
    # diff_regions = {}
    # if wrong_x_points:
    #     for wrong_x, wrong_x_shift in zip(wrong_x_points[:-1], wrong_x_points[1:]):
    #         current_diff = wrong_x_shift - wrong_x
    #         if current_diff >= area_diff:
    #             ref_x_points_table.append(False)
    #         else:
    #             ref_x_points_table.append(True)
    #
    #     if all(item for item in ref_x_points_table):
    # print(f'ref x points table: {ref_x_points_table}')


    # compute the areas of inaccurate synchronization
    ref_x_points_table = [True]
    diff_regions = {}
    if wrong_x_points:
        list_of_wrong_x = wrong_x_points[:-1]
        list_of_wrong_x_shift = wrong_x_points[1:]
        for wrong_x, wrong_x_shift in zip(list_of_wrong_x, list_of_wrong_x_shift):
            current_diff = wrong_x_shift - wrong_x
            if current_diff >= area_diff:
                ref_x_points_table.append(False)
            else:
                ref_x_points_table.append(True)

        if all(item for item in ref_x_points_table):
            diff_regions[f'{pair_names[-1]}'] = {}
            diff_regions[f'{pair_names[-1]}']['ref'] = {}
            diff_regions[f'{pair_names[-1]}']['target'] = {}
            diff_regions[f'{pair_names[-1]}']['ref'] = [min(wrong_x_points), max(wrong_x_points)]
            diff_regions[f'{pair_names[-1]}']['target'] = [min(wrong_y_points), max(wrong_y_points)]

        else:
            num_of_operations = ref_x_points_table.count(False)
            idx_of_operation = [index for (index, item) in enumerate(ref_x_points_table) if not item]
            idx_of_operation.append(len(ref_x_points_table) - 1)

            keys = range(num_of_operations + 1)
            for i, idx in zip(keys, idx_of_operation):
                diff_regions[i] = {}
                diff_regions[i]['ref'] = {}
                diff_regions[i]['target'] = {}
                if i == 0:
                    diff_regions[i]['ref'] = wrong_x_points[:idx]
                    diff_regions[i]['target'] = wrong_y_points[:idx]
                elif idx == (len(ref_x_points_table) - 1):
                    prev_idx = idx_of_operation[i - 1]
                    diff_regions[i]['ref'] = wrong_x_points[prev_idx:idx + 1]
                    diff_regions[i]['target'] = wrong_y_points[prev_idx:idx + 1]
                else:
                    prev_idx = idx_of_operation[i - 1]
                    diff_regions[i]['ref'] = wrong_x_points[prev_idx:idx]
                    diff_regions[i]['target'] = wrong_x_points[prev_idx:idx]

    if plotting:
        plt.plot(pathx, pathy, color="black")
        plt.title(f'{pair_names[0]}, {pair_names[1]}')
        plt.plot(linex[refpoint1xval:refpoint2xval + 1], liney[refpoint1xval:refpoint2xval + 1])
        plt.plot(refpointsx, refpointsy, 'o', markersize=8, color='blue')
        plt.show()

    return is_same, diff_regions


def run_structure_checker(ref_filename, filenames, wps, segmentdivider=20, diff_max=1, diff_min=0.15,
                          feature_rate=50, area_diff=10, plotting=False, debug=False):
    """Compute if the target recordings follow the same structure as the reference recording.
            Parameters
            ----------
            ref_filename : str
                Name of the reference file (no extension)

            filenames : list of str
                Names of all target files (no extensions)

            wps : list of str
                Paths to all warping paths (without the reference itself)

            Returns
            -------
            diff_recordings : list of str
                Names of all target recordings that do not follow the same structure
            diff_regions_list : dict
                Dictionary with given diff recordings and regions of bad synchronization (both ref and target)
            """

    diff_recordings = []
    diff_regions_list = []
    num_of_pairs = len(filenames)

    # Checking every combination if it has the same structure
    for i, (target_filename, wp_path) in enumerate(zip(filenames, wps), start=1):

        if debug:
            print(f"Checking files {ref_filename} vs. {target_filename} for structure differences ({i}/{num_of_pairs})")
        pair_names = [ref_filename, target_filename]

        wp = np.load(wp_path)
        is_same, diff_regions = verify_path_slope(warping_path=wp, segmentdivider=segmentdivider,
                                                  pair_names=pair_names, diff_max=diff_max,
                                                  area_diff=area_diff, diff_min=diff_min, feature_rate=feature_rate,
                                                  plotting=plotting, debug=debug)

        if debug:
            print(f'The files {ref_filename} and {target_filename} contain the same music structure: {is_same}')

        output_dic = {}
        regions_ref = []
        regions_target = []
        if not is_same:
            diff_recordings.append(target_filename)

            for k in diff_regions:
                min_value_ref = min(diff_regions[k]['ref'])
                max_value_ref = max(diff_regions[k]['ref'])
                regions_ref.append([min_value_ref, max_value_ref])
                if debug:
                    print(f'Diff regions of ref rec.: {min_value_ref} to {max_value_ref}s')

            for j in diff_regions:
                min_value_target = min(diff_regions[j]['target'])
                max_value_target = max(diff_regions[j]['target'])
                regions_target.append([min_value_target, max_value_target])
                if debug:
                    print(f'Diff regions of target rec.: {min_value_target} to {max_value_target}s')

            output_dic['filename'] = target_filename
            output_dic['ref'] = {}
            output_dic['target'] = {}
            output_dic['ref'] = regions_ref
            output_dic['target'] = regions_target

            # output_dic[target_filename] = {}
            # output_dic[target_filename]['ref'] = {}
            # output_dic[target_filename]['target'] = {}
            # output_dic[target_filename]['ref'] = regions_ref
            # output_dic[target_filename]['target'] = regions_target
            diff_regions_list.append(output_dic)
    if debug:
        print(f"Number of different structures found: {len(diff_recordings)}")
        print(f'List of recs with different structures: {diff_recordings}\n')

    return diff_recordings, diff_regions_list


def run_duplicate_finder(chromas, filenames, img_paths, hash_thresh=0, debug=False):
    """Compute hard duplicates using image hashing from chroma files.
            Parameters
            ----------
            chromas : list of str
                Paths to all chroma files (including reference)

            filenames : list of str
                Names of all files (no extensions)

            img paths : list of str
                Paths to the folders where img will be stored (should correspond to filenames)

            Returns
            -------
            duplicates: list of list of two strings [[one filename, second filename]]
                Filenames of duplicates in pairs
            """

    if len(chromas) != len(filenames):
        raise Exception('Len of chromas and filenames must be the same!')

    files_number = len(filenames)

    filenames_pairs = []
    files_images = []
    for i in range(0, files_number):
        for j in range(i + 1, files_number):
            filenames_pairs.append([filenames[i], filenames[j]])
            files_images.append([img_paths[i], img_paths[j]])

    num_of_pairs = len(filenames_pairs)
    duplicates = []

    # Checking every pair if it is a duplicate
    for i, (filePairName, img_pair) in enumerate(zip(filenames_pairs, files_images), start=1):
        file1_name = filePairName[0]
        file2_name = filePairName[1]
        image1_dir = img_pair[0]
        image2_dir = img_pair[1]
        is_duplicate = img_hash(image1_dir, image2_dir, hash_thresh, debug=debug)
        if debug:
            print(f'Checking if {file1_name} and {file2_name} are duplicates: {str(is_duplicate)}; '
                  f'[{str(i)}/{str(num_of_pairs)}]')
        if is_duplicate:
            duplicates.append([file1_name, file2_name])

    return duplicates


def img_hash(file1, file2, hash_thresh, debug=False):
    hash1 = imagehash.phash(Image.open(file1))
    hash2 = imagehash.phash(Image.open(file2))
    hash_diff = abs(hash1 - hash2)
    if debug:
        print(f'Hash diff: {hash_diff}')
    below_thresh_hard = False
    if hash_diff <= hash_thresh:
        below_thresh_hard = True
    return below_thresh_hard