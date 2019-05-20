# Selectors

Web scraper has multiple selectors that can be used for different type data
extraction and for different interaction with the website. The selectors can
be divided in three groups:

 * Data extraction selectors for data extraction.
 * Link selectors for site navigation.
 * Element selectors for element selection that separate multiple records

### Data extraction selectors

Data extraction selectors simply return data from the selected element. 
For example [Text selector] [text-selector] extracts text from
selected element. These selectors can be used as data extraction selectors:

 * [Text selector] [text-selector]
 * [Element attribute selector] [element-attribute-selector]


## Selector configuration options

Each selector has configuration options. Here you can see the most common ones.
Configuration options that are specific to a selector are described in
selectors documentation.

 * selector - CSS selector that selects an element the selector will be working
 on.
 * multiple - should be checked when multiple records (data rows) are going to
 be extracted with this selector.
 * parent selectors - configure parent selectors for this selector to make the
selector tree.

Note! A common mistake when using multiple configuration option is to create
two selectors alongside with multiple checked and expect that the scraper will
join selector values in pairs. For example if you selected pagination links and
navigation links these links couldn't be logically joined in pairs. The correct
way is to select a wrapper element with Element selector and add data selectors
as child selectors to the element selector with multiple option not checked.

 [text-selector]: Selectors/Text%20selector.md
 [link-selector]: Selectors/Link%20Selector.md
 [link-popup-selector]: Selectors/Link%20Popup%20Selector.md
 [image-selector]: Selectors/Image%20selector.md
 [element-attribute-selector]: Selectors/Element%20attribute%20selector.md
 [table-selector]: Selectors/Table%20selector.md
 [grouped-selector]: Selectors/Grouped%20selector.md
 [html-selector]: Selectors/HTML%20selector.md
 [element-selector]: Selectors/Element%20selector.md
 [element-click-selector]: Selectors/Element%20click%20selector.md
 [element-scroll-selector]: Selectors/Element%20scroll%20down%20selector.md
