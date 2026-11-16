import { createElementObject, createLayerComponent, extendContext } from '@react-leaflet/core';
import type { LayerProps } from '@react-leaflet/core';
import L from 'leaflet';
import 'leaflet.markercluster';
import type { ReactNode } from 'react';

type MarkerClusterGroupProps = LayerProps &
    L.MarkerClusterGroupOptions & {
        children?: ReactNode;
    };

export const MarkerClusterGroup = createLayerComponent<L.MarkerClusterGroup, MarkerClusterGroupProps>(
    function createMarkerClusterGroup({ children: _children, ...options }, context) {
        const instance = L.markerClusterGroup(options);

        return createElementObject(instance, extendContext(context, { layerContainer: instance }));
    },
);
