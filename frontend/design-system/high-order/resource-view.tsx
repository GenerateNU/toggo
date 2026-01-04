import { ReactElement } from "react";

export interface Resource<T> {
  data: T | null;
  /** null means the resource has never been fetched */
  loading: boolean | null;
  error?: string | null;
}

interface ResourceViewProps<T> {
  resourceState: Resource<T> | Resource<T>[] | null;
  successComponent: ReactElement | null;
  loadingComponent: ReactElement | null;
  errorComponent?: ReactElement | null;
  emptyComponent?: ReactElement | null;
  hideWhenError?: boolean;
  doNotShowLoadingIfDataAvailable?: boolean;
  showLoadingForDebug?: boolean;
  showErrorForDebug?: boolean;
  showEmptyDataForDebug?: boolean;
  visible?: boolean;
}

/**
 * A component that handles different states of resource loading
 * and renders appropriate components based on those states.
 */
const ResourceView = ({
  resourceState,
  successComponent,
  loadingComponent,
  errorComponent = null,
  emptyComponent = null,
  hideWhenError = false,
  visible = true,
  doNotShowLoadingIfDataAvailable = false,
  showLoadingForDebug = false,
  showErrorForDebug = false,
  showEmptyDataForDebug = false,
}: ResourceViewProps<unknown>): ReactElement | null => {
  // for debugging purposes
  if (__DEV__) {
    if (showLoadingForDebug) return loadingComponent;
    if (showErrorForDebug) return errorComponent;
    if (showEmptyDataForDebug) return emptyComponent;
  }

  if (visible === false) return null;
  if (!resourceState) return emptyComponent;

  // helper functions
  const hasData = (resource: Resource<unknown>): boolean =>
    resource.data != null;
  const hasError = (resource: Resource<unknown>): boolean =>
    resource.error != null;
  const isLoading = (resource: Resource<unknown>): boolean =>
    resource.loading !== false;

  const isEmpty = (
    resources: Resource<unknown> | Resource<unknown>[],
  ): boolean => {
    if (Array.isArray(resources)) {
      return resources.every(
        (resource) =>
          !resource.data ||
          (Array.isArray(resource.data) && resource.data.length === 0),
      );
    }
    return (
      !resources.data ||
      (Array.isArray(resources.data) && resources.data.length === 0)
    );
  };

  // separated handling for multiple resources
  const handleMultipleResources = (
    resources: Resource<unknown>[],
  ): ReactElement | null => {
    const anyLoading = resources.some(isLoading);
    const anyError = resources.some(hasError);
    const someDataMissing = resources.some((res) => !hasData(res));
    const isDataEmpty = isEmpty(resources);

    // handle loading state
    if (anyLoading) {
      if (doNotShowLoadingIfDataAvailable && someDataMissing) {
        return loadingComponent;
      } else if (!doNotShowLoadingIfDataAvailable) {
        return loadingComponent;
      }
    }

    // handle empty state
    if (isDataEmpty) {
      return emptyComponent;
    }

    // handle error state
    if (anyError) {
      return hideWhenError ? null : errorComponent;
    }

    // success state
    return successComponent;
  };

  // separated handling for single resource
  const handleSingleResource = (
    resource: Resource<unknown>,
  ): ReactElement | null => {
    const isResourceLoading = isLoading(resource);
    const hasResourceData = hasData(resource);
    const hasResourceError = hasError(resource);
    const isDataEmpty = isEmpty(resource);

    // handle loading state
    if (isResourceLoading) {
      const shouldShowLoading =
        !doNotShowLoadingIfDataAvailable || !hasResourceData;
      if (shouldShowLoading) {
        return loadingComponent;
      }
    }

    // handle empty state
    if (isDataEmpty) {
      return emptyComponent;
    }

    // handle error state
    if (hasResourceError) {
      return hideWhenError ? null : errorComponent;
    }

    // success state
    return successComponent;
  };

  return Array.isArray(resourceState)
    ? handleMultipleResources(resourceState)
    : handleSingleResource(resourceState);
};

export default ResourceView;
