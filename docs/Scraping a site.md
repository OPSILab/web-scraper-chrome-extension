# Scraping a site

Open the site that you want to scrape.

## Create Sitemap

The first thing you need to do when creating a *sitemap* is specifying the
start url. This is the url from which the scraping will start.

### Specify multiple urls with ranges

In cases where a site uses numbering in pages URLs it is much simpler to create 
a range start url than creating *Paging selectors* (datasetLink and lastPage) that would navigate the site.
To specify a range url:
  - Select a **RANGE** Navigation Type (QUERY_RANGE or PATH_RANGE).
  - Fill the `Nav Param Name` field, to indicate the parameter (Query or Path parameter) that will be appended to the Start Url and will vary within the range.
  - Fill the corresponding fields (`Nav Param Start` and `Nav Param End`) to specify the range of the previously specified parameter.

## Create selectors

After you have created the *sitemap* you can add selectors to it. In the
*Selectors* panel you can add new selectors, modify them and navigate the
selector tree.
The selectors can be added in a tree type structure. The web scraper will
execute the selectors in the order how they are organized in the tree
structure. For example there is a news site and you want to scrape all articles
whose links are available on the first page. In image 1 you can see this
example site.

![Fig. 1: News site][image-news-site]

To scrape this site you can create a *Link selector* which will extract all
article links in the first page. Then as a child selector you can add a
*Text selector* that will extract articles from the article pages that the
*Link selector* found links to. Image below illustrates how the *sitemap*
should be built for the news site.

![Fig. 2: News site sitemap][image-news-site-sitemap]

Note that when creating selectors use Element preview and Data preview features
to ensure that you have selected the correct elements with the correct data.

More information about selector tree building is available in selector
documentation. You should atleast read about these core selectors:

 * [Text selector][text-selector]
 * [Link selector][link-selector]
 * [Element selector][element-selector]

### Inspect selector tree

After you have created selectors for the *sitemap* you can inspect the tree
structure of selectors in the Selector graph panel. Image below shows an
example selector graph.

![Fig. 3: News site selector graph][image-news-site-selector-graph]

## Export the Sitemap the site

After you have created selectors for the *sitemap* you can export it to a JSON. Then you can import it in the "Add New Catalogue" form of the Idra Portal.


[image-news-site]: images/scraping-a-site/news-site.png?raw=true
[image-news-site-sitemap]: images/scraping-a-site/news-site-sitemap.png?raw=true
[image-news-site-selector-graph]: images/scraping-a-site/news-site-selector-graph.png?raw=true
[text-selector]: Selectors/Text%20selector.md
[link-selector]: Selectors/Link%20selector.md
[element-selector]: Selectors/Element%20selector.md