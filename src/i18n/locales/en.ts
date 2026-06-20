const en = {
  // Sidebar
  sidebar: {
    search: 'Search APIs...',
    newFolder: 'New Folder',
    newApi: 'New API',
    noResults: 'No matching APIs found',
  },

  // Folder Context Menu
  folderMenu: {
    newSubFolder: 'New Subfolder',
    newApi: 'New API',
    rename: 'Rename',
    copy: 'Copy Folder',
    move: 'Move Folder',
    delete: 'Delete Folder',
  },

  // API Context Menu
  apiMenu: {
    openInTab: 'Open in New Tab',
    rename: 'Rename',
    copy: 'Copy API',
    move: 'Move API',
    delete: 'Delete API',
  },

  // TabBar
  tab: {
    newTab: 'New Tab',
    duplicateTab: 'Duplicate',
    close: 'Close Tab',
    closeOthers: 'Close Others',
    untitled: 'Untitled',
  },

  // Request Editor
  request: {
    urlPlaceholder: 'Enter request URL...',
    send: 'Send',
    namePlaceholder: 'API Name',
    descriptionPlaceholder: 'API Description',
    details: 'Details',
  },

  // Request SubTabs
  subTabs: {
    params: 'Params',
    headers: 'Headers',
    auth: 'Auth',
    body: 'Body',
    cookies: 'Cookies',
  },

  // Params Panel
  params: {
    pathParams: 'Path Parameters',
    pathHint: 'Path parameters are auto-generated from the URL.',
    queryParams: 'Query Parameters',
    keyPlaceholder: 'Param Name',
    valuePlaceholder: 'Param Value',
  },

  // Headers Panel
  headers: {
    keyPlaceholder: 'Header Name',
    valuePlaceholder: 'Header Value',
    add: 'Add',
    bulkEdit: 'Bulk Edit',
    bulkEditTitle: 'Bulk Edit Headers',
    bulkEditPlaceholder: 'key: value\nContent-Type: application/json\nAuthorization: Bearer token123',
    apply: 'Apply',
    cancel: 'Cancel',
    cookies: 'Cookies',
  },

  // Body Panel
  body: {
    json: 'JSON',
    formData: 'Form Data',
    urlEncoded: 'UrlEncoded',
    raw: 'Raw',
    binary: 'Binary',
    jsonEditor: 'JSON Editor',
    format: 'Format',
    invalidJson: 'Invalid JSON',
    fieldName: 'Field Name',
    fieldValue: 'Field Value',
    rawPlaceholder: 'Enter raw body content...',
    selectFile: 'Select File',
  },

  // Cookies (shared i18n for inline cookies in Headers)
  cookies: {
    namePlaceholder: 'Cookie Name',
    valuePlaceholder: 'Cookie Value',
    add: 'Add Cookie',
  },

  // Auth Panel
  auth: {
    type: 'Auth Type',
    none: 'No Auth',
    bearer: 'Bearer Token',
    basic: 'Basic Auth',
    noAuth: 'This request requires no authentication',
    token: 'Token',
    tokenPlaceholder: 'Enter Bearer Token...',
    username: 'Username',
    usernamePlaceholder: 'Enter username',
    password: 'Password',
    passwordPlaceholder: 'Enter password',
  },

  // Response Viewer
  response: {
    noResponse: 'No response',
    time: 'Time',
    size: 'Size',
    noHeaders: 'No response headers',
    noCookies: 'No response cookies',
    noBody: 'No response body',
    pretty: 'Pretty',
    raw: 'Raw',
    preview: 'Preview',
    sendToGet: 'Send a request to get a response',
  },

  // App
  app: {
    emptyContent: 'Select an API or create a new request',
  },

  // KeyValue Table (shared)
  kvTable: {
    key: 'Key',
    value: 'Value',
    description: 'Description',
  },
};

export default en;
