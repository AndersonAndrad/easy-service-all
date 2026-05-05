export interface PaginatedResponse<TypeItem> {
  items: TypeItem[];
  info: {
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface PaginatedRequest {
  page: number;
  pageSize: number;
}
