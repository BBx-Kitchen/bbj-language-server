export const builtinEvents = `
library

/@@
Window Activation
@/
var ON_ACTIVATE: event_type

/@@
Window Mouse Click
@/
var ON_CLICK: event_type

/@@
Window Close Box
@/
var ON_CLOSE: event_type

/@@
Window System Color Change
@/
var ON_COLOR_CHANGE: event_type

/@@
Window Deactivation
@/
var ON_DEACTIVATE: event_type

/@@
Window Mouse Double-Click
@/
var ON_DOUBLE_CLICK: event_type

/@@
Window Keypress
@/
var ON_KEYPRESS: event_type

/@@
Window MDI Closing Event
@/
var ON_MDI_CLOSING: event_type

/@@
Window Minimize
@/
var ON_MINIMIZE: event_type

/@@
Window Mouse Button Down
@/
var ON_MOUSE_DOWN: event_type

/@@
Window Mouse Enter
@/
var ON_MOUSE_ENTER: event_type

/@@
Window Mouse Exit
@/
var ON_MOUSE_EXIT: event_type

/@@
Window Mouse Move
@/
var ON_MOUSE_MOVE: event_type

/@@
Window Mouse Scroll Wheel
@/
var ON_MOUSE_SCROLL: event_type

/@@
Window Mouse Button Up
@/
var ON_MOUSE_UP: event_type

/@@
Window Resize
@/
var ON_RESIZE: event_type

/@@
Window Restore
@/
var ON_RESTORE: event_type

/@@
Window Screen Resize Event
@/
var ON_SCREEN_RESIZE: event_type

/@@
Window Focus Gained
@/
var ON_WINDOW_GAINED_FOCUS: event_type

/@@
Window Lost Event
@/
var ON_WINDOW_LOST_FOCUS: event_type

/@@
Window Move Event
@/
var ON_WINDOW_MOVE: event_type

/@@
Window Scrollbar Move
@/
var ON_WINDOW_SCROLL: event_type

/@@
Menu Events
@/
var ON_MENU_ITEM_SELECT: event_type

/@@
Popup Menu Selection
@/
var ON_POPUP_ITEM_SELECT: event_type

/@@
Control Push Button Event
@/
var ON_BUTTON_PUSH: event_type

/@@
Control CELLSELECTCHANGE Grid Notify Event
@/
var ON_CELL_SELECTION_CHANGE: event_type

/@@
Control Check Change Event
@/
var ON_CHECK_CHANGE: event_type

/@@
Control Check Off Event
@/
var ON_CHECK_OFF: event_type

/@@
Control Check On Event
@/
var ON_CHECK_ON: event_type

/@@
Control ColorChooser Approve Event
@/
var ON_COLORCHOOSER_APPROVE: event_type

/@@
Control ColorChooser Cancel Event
@/
var ON_COLORCHOOSER_CANCEL: event_type

/@@
Control ColorChooser Change Event
@/
var ON_COLORCHOOSER_CHANGE: event_type

/@@
Control Grid Notify Event
@/
var ON_COLUMN_SELECTION_CHANGE: event_type

/@@
Control Scrollbar Move Event
@/
var ON_CONTROL_SCROLL: event_type

/@@
Control Validation Event
@/
var ON_CONTROL_VALIDATION: event_type

/@@
Control N/A
@/
var ON_DB_GRID_ROW_CHANGE_REQUEST: event_type

/@@
Web Component Defined Event
@/
var ON_DEFINED: event_type

/@@
Drag Source Drop Event
@/
var ON_DRAG_SOURCE_DROP: event_type

/@@
Drop Target Drop Event
@/
var ON_DROP_TARGET_DROP: event_type

/@@
Edit Control Notify
@/
var ON_EDIT_KEYPRESS: event_type

/@@
Edit Control Modify Event
@/
var ON_EDIT_MODIFY: event_type

/@@
Execute Script Event
@/
var ON_EXECUTE_SCRIPT: event_type

/@@
FileChooser Approve Event
@/
var ON_FILECHOOSER_APPROVE: event_type

/@@
FileChooser Cancel Event
@/
var ON_FILECHOOSER_CANCEL: event_type

/@@
FileChooser Change Event
@/
var ON_FILECHOOSER_CHANGE: event_type

/@@
FileChooser Filter Event
@/
var ON_FILECHOOSER_FILTER: event_type

/@@
FontChooser Approve Event
@/
var ON_FONTCHOOSER_APPROVE: event_type

/@@
FontChooser Cancel Event
@/
var ON_FONTCHOOSER_CANCEL: event_type

/@@
FontChooser Change Event
@/
var ON_FONTCHOOSER_CHANGE: event_type

/@@
Form Validation Event
@/
var ON_FORM_VALIDATION: event_type

/@@
Control Focus Gained/Lost Event
@/
var ON_GAINED_FOCUS: event_type

/@@
Grid Notify Event
@/
var ON_GRID_CELL_MODIFY: event_type

/@@
Grid Cell Query Event
@/
var ON_GRID_CELL_QUERY: event_type

/@@
Grid Cell Validation Event
@/
var ON_GRID_CELL_VALIDATION: event_type

/@@
Grid Control Event
@/
var ON_GRID_CHECK_OFF: event_type

/@@
Grid Control Event
@/
var ON_GRID_CHECK_ON: event_type

/@@
COLUMNSIZED Grid Notify Event
@/
var ON_GRID_COLUMN_SIZE: event_type

/@@
DCLICKED Grid Notify Event
@/
var ON_GRID_DOUBLE_CLICK: event_type

/@@
DRAGDROP Grid Notify Event
@/
var ON_GRID_DRAG_DROP: event_type

/@@
EDITSET Grid Notify Event
@/
var ON_GRID_EDIT_START: event_type

/@@
EDITKILL Grid Notify Event
@/
var ON_GRID_EDIT_STOP: event_type

/@@
ENTER Grid Notify Event
@/
var ON_GRID_ENTER_KEY: event_type

/@@
ERROR Grid Notify Event
@/
var ON_GRID_ERROR: event_type

/@@
SETFOCUS
@/
var ON_GRID_GAINED_FOCUS: event_type

/@@
HITBOTTOM Grid Notify Event
@/
var ON_GRID_HIT_BOTTOM: event_type

/@@
HITTOP Grid Notify Event
@/
var ON_GRID_HIT_TOP: event_type

/@@
KEYBOARD Grid Notify Event
@/
var ON_GRID_KEYPRESS: event_type

/@@
LEFTCOLCHANGE Grid Notify Event
@/
var ON_GRID_LEFT_COLUMN_CHANGE: event_type

/@@
LISTCANCEL Grid Notify Event
@/
var ON_GRID_LIST_CANCEL: event_type

/@@
LISTCHANGE Grid Notify Event
@/
var ON_GRID_LIST_CHANGE: event_type

/@@
LISTCLICK Grid Notify Event
@/
var ON_GRID_LIST_CLICK: event_type

/@@
LISTCLOSE Grid Notify Event
@/
var ON_GRID_LIST_CLOSE: event_type

/@@
LISTOPEN Grid Notify Event
@/
var ON_GRID_LIST_OPEN: event_type

/@@
LISTSELECT Grid Notify Event
@/
var ON_GRID_LIST_SELECT: event_type

/@@
KILLFOCUS
@/
var ON_GRID_LOST_FOCUS: event_type

/@@
LCLICKED Grid Notify Event
LCLICKED2 Grid Notify Event
@/
var ON_GRID_MOUSE_DOWN: event_type

/@@
MOUSECAPTURE Grid Notify Event
@/
var ON_GRID_MOUSE_DRAG: event_type

/@@
MOUSECAPTURE Grid Notify Event
@/
var ON_GRID_MOUSE_MOVE: event_type

/@@
LCLICKED Grid Notify Event
@/
var ON_GRID_MOUSE_UP: event_type

/@@
RCLICKED Grid Notify Event
@/
var ON_GRID_RIGHT_MOUSE_DOWN: event_type

/@@
RCLICKED Grid Notify Event
@/
var ON_GRID_RIGHT_MOUSE_UP: event_type

/@@
ROWDELETE Grid Notify Event
@/
var ON_GRID_ROW_DELETE: event_type

/@@
ROWINSERT Grid Notify Event
@/
var ON_GRID_ROW_INSERT: event_type

/@@
ROWCANCEL Grid Notify Event
@/
var ON_GRID_ROW_INSERT_CANCEL: event_type

/@@
ROWUPDATE Grid Notify Event
@/
var ON_GRID_ROW_UPDATE: event_type

/@@
ROWVALIDATION Notify Event
@/
var ON_GRID_ROW_VALIDATION: event_type

/@@
CELLCHANGE Grid Notify Event
@/
var ON_GRID_SELECT_CELL: event_type

/@@
COLCHANGE Grid Notify Event
@/
var ON_GRID_SELECT_COLUMN: event_type

/@@
ROWCHANGE Grid Notify Event
@/
var ON_GRID_SELECT_ROW: event_type

/@@
EDITKEY Grid Notify Event
@/
var ON_GRID_SPECIAL_KEY: event_type

/@@
TOPROWCHANGE Grid Notify Event
@/
var ON_GRID_TOP_ROW_CHANGE: event_type

/@@
TABLEUPDATE Grid Notify Event
@/
var ON_GRID_UPDATE: event_type

/@@
Hyperlink Activate Event
@/
var ON_HYPERLINK_ACTIVATE: event_type

/@@
Hyperlink Enter Event
@/
var ON_HYPERLINK_ENTER: event_type

/@@
Hyperlink Exit Event
@/
var ON_HYPERLINK_EXIT: event_type

/@@
Input Control Keypress
@/
var ON_INPUT_KEYPRESS: event_type

/@@
List Button and List Edit Notify Events
@/
var ON_LIST_CANCEL: event_type

/@@
List Button and List Edit Notify Events
@/
var ON_LIST_CHANGE: event_type

/@@
List Item Click Event
@/
var ON_LIST_CLICK: event_type

/@@
List Button and List Edit Notify Events
@/
var ON_LIST_CLOSE: event_type

/@@
List Item Click Event
@/
var ON_LIST_DOUBLE_CLICK: event_type

/@@
List Button and List Edit Notify Events
@/
var ON_LIST_OPEN: event_type

/@@
List Button and List Edit Notify Events
@/
var ON_LIST_SELECT: event_type

/@@
Control Focus Gained/Lost Event
@/
var ON_LOST_FOCUS: event_type

/@@
Mouse Enter Event
@/
var ON_MOUSE_ENTER: event_type

/@@
Mouse Exit Event
@/
var ON_MOUSE_EXIT: event_type

/@@
Native JavaScript Event
@/
var ON_NATIVE_JAVASCRIPT: event_type

/@@
Navigator Notify Event
@/
var ON_NAV_FIRST: event_type

/@@
Navigator Notify Event
@/
var ON_NAV_LAST: event_type

/@@
Navigator Notify Event
@/
var ON_NAV_NEXT: event_type

/@@
Navigator Notify Event
@/
var ON_NAV_PREVIOUS: event_type

/@@
Page Loaded Event
@/
var ON_PAGE_LOADED: event_type

/@@
Popup Request Event
@/
var ON_POPUP_REQUEST: event_type

/@@
Right Mouse Button Down Event
@/
var ON_RIGHT_MOUSE_DOWN: event_type

/@@
ROWSELECTIONCHANGE Grid Notify Event
@/
var ON_ROW_SELECTION_CHANGE: event_type

/@@
Script Failed Event
@/
var ON_SCRIPT_FAILED: event_type

/@@
Script Loaded Event
@/
var ON_SCRIPT_LOADED: event_type

/@@
Radio Group Selection Change Event
@/
var ON_SELECTION_CHANGE: event_type

/@@
N/A
@/
var ON_SPIN: event_type

/@@
State Change Event
@/
var ON_STATE_CHANGE: event_type

/@@
Tab Close Notify Event
@/
var ON_TAB_CLOSE: event_type

/@@
Tab Selection Notify Event
@/
var ON_TAB_DESELECT: event_type

/@@
Keypress Notify Event
@/
var ON_TAB_KEYPRESS: event_type

/@@
Tab Popup Notify Event
@/
var ON_TAB_POPUP: event_type

/@@
Tab Selection Notify Event
@/
var ON_TAB_SELECT: event_type

/@@
Tool Button Push Event
@/
var ON_TOOL_BUTTON_PUSH: event_type

/@@
Tree Node Collapsed
@/
var ON_TREE_COLLAPSE: event_type

/@@
Tree Node Deselected
@/
var ON_TREE_DESELECT: event_type

/@@
Double-click on Tree
@/
var ON_TREE_DOUBLE_CLICK: event_type

/@@
Tree Node Edit Stopped
@/
var ON_TREE_EDIT_STOP: event_type

/@@
Tree Node Expanded
@/
var ON_TREE_EXPAND: event_type

/@@
Left Mouse Down
@/
var ON_TREE_MOUSE_DOWN: event_type

/@@
Left Mouse Up
@/
var ON_TREE_MOUSE_UP: event_type

/@@
Right Mouse Down
@/
var ON_TREE_RIGHT_MOUSE_DOWN: event_type

/@@
Right Mouse Up
@/
var ON_TREE_RIGHT_MOUSE_UP: event_type

/@@
Tree Node Selected
@/
var ON_TREE_SELECT: event_type

/@@
N/A
@/
var ON_WEB_EVENT: event_type

/@@
BBjBrowserBackEvent
@/
var ON_BROWSER_BACK: event_type

/@@
BBjBrowserCloseEvent
@/
var ON_BROWSER_CLOSE: event_type

/@@
BBjGeolocationEvent
@/
var ON_GEOLOCATION_POSITION: event_type	

/@@
BBjGeolocationEvent
@/
var ON_GEOLOCATION_WATCH: event_type	

/@@
BBjLinkFailedEvent
@/
var ON_LINK_FAILED: event_type

/@@
BBjLinkLoadedEvent
@/
var ON_LINK_LOADED: event_type

/@@
BBjNamespaceEvent
@/
var ON_NAMESPACE_CHANGE: event_type	

/@@
Timer Event
@/
var ON_TIMER: event_type	

/@@
BBjServletEvent
@/
var ON_WEB_CONNECTION: event_type	 
`;