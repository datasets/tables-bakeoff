/* The four shared datasets. Every library renders all four; each one
 * stresses a different axis. Descriptions are shown on the demo cards. */
export const DATASETS = {
  small: {
    key: "small", file: "/data/small.parquet", eager: true,
    title: "Small & rich — 1,000 property sales",
    desc: "Sixteen columns of mixed types: prices, dates, postcodes, street names, nulls.",
    stress: "Typography, alignment, number and date formatting, null rendering, text overflow.",
  },
  wide: {
    key: "wide", file: "/data/wide.parquet", eager: true,
    title: "Wide — 80 columns",
    desc: "The same 1,000 sales plus 64 derived numeric columns.",
    stress: "Horizontal scrolling, column virtualization, header behaviour, column pinning.",
  },
  medium: {
    key: "medium", file: "/data/medium.parquet", eager: true,
    title: "Medium — 50,000 rows",
    desc: "Where rendering every row as real DOM starts to hurt but has not yet collapsed.",
    stress: "Row virtualization quality, sort and filter responsiveness.",
  },
  large: {
    key: "large", file: "/data/large.parquet", eager: false,
    title: "Large — 500,000 rows",
    desc: "A full year of English and Welsh property sales. Loaded on demand.",
    stress: "Load time, sustained scroll FPS, memory, sorting at scale.",
  },
};

export const DATASET_KEYS = Object.keys(DATASETS);
