export const builtinEvents = `
library

/@@
Window Activation
@/
eventtype ON_ACTIVATE

/@@
Window Mouse Click
@/
eventtype ON_CLICK

/@@
Window Close Box
@/
eventtype ON_CLOSE

/@@
Window System Color Change
@/
eventtype ON_COLOR_CHANGE

/@@
Window Deactivation
@/
eventtype ON_DEACTIVATE

/@@
Window Mouse Double-Click
@/
eventtype ON_DOUBLE_CLICK

/@@
Window Keypress
@/
eventtype ON_KEYPRESS

/@@
Window MDI Closing Event
@/
eventtype ON_MDI_CLOSING

/@@
Window Minimize
@/
eventtype ON_MINIMIZE

/@@
Window Mouse Button Down
@/
eventtype ON_MOUSE_DOWN

/@@
Window Mouse Enter
@/
eventtype ON_MOUSE_ENTER

/@@
Window Mouse Exit
@/
eventtype ON_MOUSE_EXIT

/@@
Window Mouse Move
@/
eventtype ON_MOUSE_MOVE

/@@
Window Mouse Scroll Wheel
@/
eventtype ON_MOUSE_SCROLL

/@@
Window Mouse Button Up
@/
eventtype ON_MOUSE_UP

/@@
Window Resize
@/
eventtype ON_RESIZE

/@@
Window Restore
@/
eventtype ON_RESTORE

/@@
Window Screen Resize Event
@/
eventtype ON_SCREEN_RESIZE

/@@
Window Focus Gained
@/
eventtype ON_WINDOW_GAINED_FOCUS

/@@
Window Lost Event
@/
eventtype ON_WINDOW_LOST_FOCUS

/@@
Window Move Event
@/
eventtype ON_WINDOW_MOVE

/@@
Window Scrollbar Move
@/
eventtype ON_WINDOW_SCROLL

/@@
Menu Events
@/
eventtype ON_MENU_ITEM_SELECT

/@@
Popup Menu Selection
@/
eventtype ON_POPUP_ITEM_SELECT

/@@
Control Push Button Event
@/
eventtype ON_BUTTON_PUSH

/@@
Control CELLSELECTCHANGE Grid Notify Event
@/
eventtype ON_CELL_SELECTION_CHANGE

/@@
Control Check Change Event
@/
eventtype ON_CHECK_CHANGE

/@@
Control Check Off Event
@/
eventtype ON_CHECK_OFF

/@@
Control Check On Event
@/
eventtype ON_CHECK_ON

/@@
Control ColorChooser Approve Event
@/
eventtype ON_COLORCHOOSER_APPROVE

/@@
Control ColorChooser Cancel Event
@/
eventtype ON_COLORCHOOSER_CANCEL

/@@
Control ColorChooser Change Event
@/
eventtype ON_COLORCHOOSER_CHANGE

/@@
Control Grid Notify Event
@/
eventtype ON_COLUMN_SELECTION_CHANGE

/@@
Control Scrollbar Move Event
@/
eventtype ON_CONTROL_SCROLL

/@@
Control Validation Event
@/
eventtype ON_CONTROL_VALIDATION

/@@
Control N/A
@/
eventtype ON_DB_GRID_ROW_CHANGE_REQUEST

/@@
Web Component Defined Event
@/
eventtype ON_DEFINED

/@@
Drag Source Drop Event
@/
eventtype ON_DRAG_SOURCE_DROP

/@@
Drop Target Drop Event
@/
eventtype ON_DROP_TARGET_DROP

/@@
Edit Control Notify
@/
eventtype ON_EDIT_KEYPRESS

/@@
Edit Control Modify Event
@/
eventtype ON_EDIT_MODIFY

/@@
Execute Script Event
@/
eventtype ON_EXECUTE_SCRIPT

/@@
FileChooser Approve Event
@/
eventtype ON_FILECHOOSER_APPROVE

/@@
FileChooser Cancel Event
@/
eventtype ON_FILECHOOSER_CANCEL

/@@
FileChooser Change Event
@/
eventtype ON_FILECHOOSER_CHANGE

/@@
FileChooser Filter Event
@/
eventtype ON_FILECHOOSER_FILTER

/@@
FontChooser Approve Event
@/
eventtype ON_FONTCHOOSER_APPROVE

/@@
FontChooser Cancel Event
@/
eventtype ON_FONTCHOOSER_CANCEL

/@@
FontChooser Change Event
@/
eventtype ON_FONTCHOOSER_CHANGE

/@@
Form Validation Event
@/
eventtype ON_FORM_VALIDATION

/@@
Control Focus Gained/Lost Event
@/
eventtype ON_GAINED_FOCUS

/@@
Grid Notify Event
@/
eventtype ON_GRID_CELL_MODIFY

/@@
Grid Cell Query Event
@/
eventtype ON_GRID_CELL_QUERY

/@@
Grid Cell Validation Event
@/
eventtype ON_GRID_CELL_VALIDATION

/@@
Grid Control Event
@/
eventtype ON_GRID_CHECK_OFF

/@@
Grid Control Event
@/
eventtype ON_GRID_CHECK_ON

/@@
COLUMNSIZED Grid Notify Event
@/
eventtype ON_GRID_COLUMN_SIZE

/@@
DCLICKED Grid Notify Event
@/
eventtype ON_GRID_DOUBLE_CLICK

/@@
DRAGDROP Grid Notify Event
@/
eventtype ON_GRID_DRAG_DROP

/@@
EDITSET Grid Notify Event
@/
eventtype ON_GRID_EDIT_START

/@@
EDITKILL Grid Notify Event
@/
eventtype ON_GRID_EDIT_STOP

/@@
ENTER Grid Notify Event
@/
eventtype ON_GRID_ENTER_KEY

/@@
ERROR Grid Notify Event
@/
eventtype ON_GRID_ERROR

/@@
SETFOCUS
@/
eventtype ON_GRID_GAINED_FOCUS

/@@
HITBOTTOM Grid Notify Event
@/
eventtype ON_GRID_HIT_BOTTOM

/@@
HITTOP Grid Notify Event
@/
eventtype ON_GRID_HIT_TOP

/@@
KEYBOARD Grid Notify Event
@/
eventtype ON_GRID_KEYPRESS

/@@
LEFTCOLCHANGE Grid Notify Event
@/
eventtype ON_GRID_LEFT_COLUMN_CHANGE

/@@
LISTCANCEL Grid Notify Event
@/
eventtype ON_GRID_LIST_CANCEL

/@@
LISTCHANGE Grid Notify Event
@/
eventtype ON_GRID_LIST_CHANGE

/@@
LISTCLICK Grid Notify Event
@/
eventtype ON_GRID_LIST_CLICK

/@@
LISTCLOSE Grid Notify Event
@/
eventtype ON_GRID_LIST_CLOSE

/@@
LISTOPEN Grid Notify Event
@/
eventtype ON_GRID_LIST_OPEN

/@@
LISTSELECT Grid Notify Event
@/
eventtype ON_GRID_LIST_SELECT

/@@
KILLFOCUS
@/
eventtype ON_GRID_LOST_FOCUS

/@@
LCLICKED Grid Notify Event
LCLICKED2 Grid Notify Event
@/
eventtype ON_GRID_MOUSE_DOWN

/@@
MOUSECAPTURE Grid Notify Event
@/
eventtype ON_GRID_MOUSE_DRAG

/@@
MOUSECAPTURE Grid Notify Event
@/
eventtype ON_GRID_MOUSE_MOVE

/@@
LCLICKED Grid Notify Event
@/
eventtype ON_GRID_MOUSE_UP

/@@
RCLICKED Grid Notify Event
@/
eventtype ON_GRID_RIGHT_MOUSE_DOWN

/@@
RCLICKED Grid Notify Event
@/
eventtype ON_GRID_RIGHT_MOUSE_UP

/@@
ROWDELETE Grid Notify Event
@/
eventtype ON_GRID_ROW_DELETE

/@@
ROWINSERT Grid Notify Event
@/
eventtype ON_GRID_ROW_INSERT

/@@
ROWCANCEL Grid Notify Event
@/
eventtype ON_GRID_ROW_INSERT_CANCEL

/@@
ROWUPDATE Grid Notify Event
@/
eventtype ON_GRID_ROW_UPDATE

/@@
ROWVALIDATION Notify Event
@/
eventtype ON_GRID_ROW_VALIDATION

/@@
CELLCHANGE Grid Notify Event
@/
eventtype ON_GRID_SELECT_CELL

/@@
COLCHANGE Grid Notify Event
@/
eventtype ON_GRID_SELECT_COLUMN

/@@
ROWCHANGE Grid Notify Event
@/
eventtype ON_GRID_SELECT_ROW

/@@
EDITKEY Grid Notify Event
@/
eventtype ON_GRID_SPECIAL_KEY

/@@
TOPROWCHANGE Grid Notify Event
@/
eventtype ON_GRID_TOP_ROW_CHANGE

/@@
TABLEUPDATE Grid Notify Event
@/
eventtype ON_GRID_UPDATE

/@@
Hyperlink Activate Event
@/
eventtype ON_HYPERLINK_ACTIVATE

/@@
Hyperlink Enter Event
@/
eventtype ON_HYPERLINK_ENTER

/@@
Hyperlink Exit Event
@/
eventtype ON_HYPERLINK_EXIT

/@@
Input Control Keypress
@/
eventtype ON_INPUT_KEYPRESS

/@@
List Button and List Edit Notify Events
@/
eventtype ON_LIST_CANCEL

/@@
List Button and List Edit Notify Events
@/
eventtype ON_LIST_CHANGE

/@@
List Item Click Event
@/
eventtype ON_LIST_CLICK

/@@
List Button and List Edit Notify Events
@/
eventtype ON_LIST_CLOSE

/@@
List Item Click Event
@/
eventtype ON_LIST_DOUBLE_CLICK

/@@
List Button and List Edit Notify Events
@/
eventtype ON_LIST_OPEN

/@@
List Button and List Edit Notify Events
@/
eventtype ON_LIST_SELECT

/@@
Control Focus Gained/Lost Event
@/
eventtype ON_LOST_FOCUS

/@@
Mouse Enter Event
@/
eventtype ON_MOUSE_ENTER

/@@
Mouse Exit Event
@/
eventtype ON_MOUSE_EXIT

/@@
Native JavaScript Event
@/
eventtype ON_NATIVE_JAVASCRIPT

/@@
Navigator Notify Event
@/
eventtype ON_NAV_FIRST

/@@
Navigator Notify Event
@/
eventtype ON_NAV_LAST

/@@
Navigator Notify Event
@/
eventtype ON_NAV_NEXT

/@@
Navigator Notify Event
@/
eventtype ON_NAV_PREVIOUS

/@@
Page Loaded Event
@/
eventtype ON_PAGE_LOADED

/@@
Popup Request Event
@/
eventtype ON_POPUP_REQUEST

/@@
Right Mouse Button Down Event
@/
eventtype ON_RIGHT_MOUSE_DOWN

/@@
ROWSELECTIONCHANGE Grid Notify Event
@/
eventtype ON_ROW_SELECTION_CHANGE

/@@
Script Failed Event
@/
eventtype ON_SCRIPT_FAILED

/@@
Script Loaded Event
@/
eventtype ON_SCRIPT_LOADED

/@@
Radio Group Selection Change Event
@/
eventtype ON_SELECTION_CHANGE

/@@
N/A
@/
eventtype ON_SPIN

/@@
State Change Event
@/
eventtype ON_STATE_CHANGE

/@@
Tab Close Notify Event
@/
eventtype ON_TAB_CLOSE

/@@
Tab Selection Notify Event
@/
eventtype ON_TAB_DESELECT

/@@
Keypress Notify Event
@/
eventtype ON_TAB_KEYPRESS

/@@
Tab Popup Notify Event
@/
eventtype ON_TAB_POPUP

/@@
Tab Selection Notify Event
@/
eventtype ON_TAB_SELECT

/@@
Tool Button Push Event
@/
eventtype ON_TOOL_BUTTON_PUSH

/@@
Tree Node Collapsed
@/
eventtype ON_TREE_COLLAPSE

/@@
Tree Node Deselected
@/
eventtype ON_TREE_DESELECT

/@@
Double-click on Tree
@/
eventtype ON_TREE_DOUBLE_CLICK

/@@
Tree Node Edit Stopped
@/
eventtype ON_TREE_EDIT_STOP

/@@
Tree Node Expanded
@/
eventtype ON_TREE_EXPAND

/@@
Left Mouse Down
@/
eventtype ON_TREE_MOUSE_DOWN

/@@
Left Mouse Up
@/
eventtype ON_TREE_MOUSE_UP

/@@
Right Mouse Down
@/
eventtype ON_TREE_RIGHT_MOUSE_DOWN

/@@
Right Mouse Up
@/
eventtype ON_TREE_RIGHT_MOUSE_UP

/@@
Tree Node Selected
@/
eventtype ON_TREE_SELECT

/@@
N/A
@/
eventtype ON_WEB_EVENT

/@@
BBjBrowserBackEvent
@/
eventtype ON_BROWSER_BACK

/@@
BBjBrowserCloseEvent
@/
eventtype ON_BROWSER_CLOSE

/@@
BBjGeolocationEvent
@/
eventtype ON_GEOLOCATION_POSITION	

/@@
BBjGeolocationEvent
@/
eventtype ON_GEOLOCATION_WATCH	

/@@
BBjLinkFailedEvent
@/
eventtype ON_LINK_FAILED

/@@
BBjLinkLoadedEvent
@/
eventtype ON_LINK_LOADED

/@@
BBjNamespaceEvent
@/
eventtype ON_NAMESPACE_CHANGE	

/@@
Timer Event
@/
eventtype ON_TIMER	

/@@
BBjServletEvent
@/
eventtype ON_WEB_CONNECTION	 
 
`;