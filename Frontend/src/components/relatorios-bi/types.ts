export type WidgetType = "bar" | "line" | "pie" | "kpi";

export type WidgetDefinition = {
  id: string;
  title: string;
  chartType: WidgetType;
  objectId: number;
  objectLabel: string;
  groupBy: string;
  aggregate: string;
  aggregateField: string;
  data: Record<string, unknown>[];
};

export type MetaObject = {
  id: number;
  nomeAmigavel: string;
  tipo: "base" | "custom";
  fields: string[];
};
