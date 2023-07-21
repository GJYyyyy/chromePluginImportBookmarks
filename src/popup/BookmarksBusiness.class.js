/**
 * 书签插件业务类
 */
class BookmarksBusiness extends EventTarget {
    #bookmarksCURD;

    #bookmarkTree;
    #bookmarkList;
    #repeatBookmarkMap;

    #bookmarksAllCount;
    #bookmarksGroupAllCount;
    #bookmarksRepeatAllCount;

    #newBookmarkTree;
    #newBookmarkList;
    #importingBookmarkCount;

    #clearingBookmarkCount;

    #needDeleteBookmarks;
    #deleteingRepeatBookmarkCount;

    getBookmarkTree() {
        return this.#bookmarkTree;
    }
    getBookmarkList() {
        return this.#bookmarkList;
    }
    getRepeatBookmarkMap() {
        return this.#repeatBookmarkMap;
    }
    getBookmarksAllCount() {
        return this.#bookmarksAllCount;
    }
    getBookmarksGroupAllCount() {
        return this.#bookmarksGroupAllCount;
    }
    getBookmarksRepeatAllCount() {
        return this.#bookmarksRepeatAllCount;
    }

    /**
     * 初始化
     */
    async init() {
        this.#bookmarksCURD = new BookmarksCURD();

        this.#bookmarkTree = await this.#bookmarksCURD.getBookmarkTree();
        this.#bookmarkList = [];
        this.transBookmarkTree2List(this.#bookmarkTree, this.#bookmarkList);
        this.#repeatBookmarkMap = this.groupByUrl();

        this.#bookmarksAllCount = this.#bookmarkList.filter(v => !this.isGroup(v)).length;
        this.#bookmarksGroupAllCount = this.#bookmarkList.length - this.#bookmarksAllCount;
        let bookmarksRepeatAllCount = 0;
        this.#repeatBookmarkMap.forEach(v => {
            bookmarksRepeatAllCount += v.length - 1;
        })
        this.#bookmarksRepeatAllCount = bookmarksRepeatAllCount;

        this.#newBookmarkTree = [];
        this.#newBookmarkList = [];
        this.#importingBookmarkCount = 0;
        this.#clearingBookmarkCount = 0;
        this.#needDeleteBookmarks = [];
        this.#deleteingRepeatBookmarkCount = 0;
    }

    /**
     * 判断书签树节点是否是分组节点
     * @param {Object} bookmark 
     * @returns {boolean}
     */
    isGroup(bookmark) {
        if (
            bookmark.url === undefined &&
            bookmark.children instanceof Array
        ) return true;
        return false;
    }

    /**
     * 判断书签树节点是否是根分组节点
     * @param {Object} bookmark 
     * @returns {boolean}
     */
    isRootGroup(bookmark) {
        let rootGroupNameList = ['书签栏', '其他书签', '移动设备书签'];
        if (
            this.isGroup(bookmark) &&
            (
                bookmark.id === '0' ||
                bookmark.parentId === '0'
            ) &&
            rootGroupNameList.find(title => title === bookmark.title)
        ) return true;
        return false;
    }

    /**
     * 根据原始书签数据转换得到一维书签数据
     * @param {Array} bookmarkTree 
     * @param {Array} bookmarkList 
     */
    transBookmarkTree2List(bookmarkTree, bookmarkList) {
        for (let v of bookmarkTree) {
            bookmarkList.push(v);
            if (v.children) {
                this.transBookmarkTree2List(v.children, bookmarkList)
            }
        }
    }

    /**
     * 根据url分组书签
     * @param {Array} bookmarkList 
     * @returns {Array}
     */
    groupByUrl(bookmarkList = this.#bookmarkList) {
        let repeatMap = new Map();
        bookmarkList
            .filter(v => !this.isGroup(v))
            .forEach(bookmark => {
                let url = bookmark.url;
                if (repeatMap.has(url)) {
                    repeatMap.get(url).push(bookmark);
                } else {
                    repeatMap.set(url, [bookmark])
                }
            })

        // 根据相同url的书签数量排序
        let repeatList = Array.from(repeatMap);
        repeatList.sort((a, b) => b[1].length - a[1].length);
        repeatMap = new Map(repeatList);

        return repeatMap;
    }

    /**
     * 导入书签并自动合并，不会像chrome自带的导入工具一样新建一个已导入的分组
     * 请使用chrome自带的导出工具导出的html文件
     * @param {File} file
     */
    importBookmarks(file) {
        return new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.readAsText(file, 'utf-8');
            fr.onerror = reject;
            fr.onload = async () => {
                let $dv = document.createElement('div');
                $dv.innerHTML = fr.result;
                const dlList = Array.from($dv.children).filter(v => v.tagName === 'DL');
                this.#transTagTree(dlList[0], this.#newBookmarkTree);
                this.transBookmarkTree2List(this.#newBookmarkTree, this.#newBookmarkList);
                await this.#mergeBookmarks(this.#newBookmarkTree);
                await this.init();
                resolve();
            }
        })
    }

    /**
     * 将 html书签树结构 转换为 普通书签树结构
     * @param {HTMLDListElement} dl dl元素
     * @param {Array} bookmarkTree 
     */
    #transTagTree(dl, bookmarkTree) {
        let dlChildren = Array.from(dl.children);
        let dtList = dlChildren.filter(dlChild => dlChild.tagName === 'DT');
        dtList.forEach(dt => {
            let groupTitle = dt.querySelector('h3'),
                subDl = dt.querySelector('dl');
            let title, url, children;
            if (groupTitle) {
                title = groupTitle.innerText;
                children = [];
                this.#transTagTree(subDl, children);
            } else {
                let $a = dt.querySelector('a');
                title = $a.innerText;
                url = $a.href;
            }
            bookmarkTree.push({
                title,
                url,
                children
            })
        })
    }

    /**
     * 将旧书签节点树和新书签节点树合并，相同标题的新书签分组节点会被忽略，相同url的新书签会被放到和旧书签同一个书签分组下。
     * @param {Array} newBookmarkTree 
     */
    async #mergeBookmarks(newBookmarkTree = []) {
        let oldBookmarkList = this.#bookmarkList;
        for (let i = 0; i < newBookmarkTree.length; i++) {
            let newBookmark = newBookmarkTree[i];
            this.#importingBookmarkCount++;
            this.dispatchEvent(new Event('import'));
            if (this.isRootGroup(newBookmark)) {
                await this.#mergeBookmarks(newBookmark.children);
            } else {
                if (this.isGroup(newBookmark)) {
                    // 分组
                    let find = oldBookmarkList.find(oldBookmark => oldBookmark.title === newBookmark.title);
                    if (find) {
                        newBookmark.children = newBookmark.children.map(newBookmarkChild => ({ ...newBookmarkChild, parentId: find.id }));
                        await this.#mergeBookmarks(newBookmark.children);
                    } else {
                        let insertBookmarkGroup = await this.#bookmarksCURD.addBookmarkGroup(newBookmark.title, newBookmark.parentId);
                        newBookmark.children = newBookmark.children.map(newBookmarkChild => ({ ...newBookmarkChild, parentId: insertBookmarkGroup.id }));
                        await this.#mergeBookmarks(newBookmark.children);
                    }
                } else {
                    // 书签
                    let find = oldBookmarkList.find(oldBookmark => oldBookmark.url === newBookmark.url);
                    if (find) {
                        let insertBookmark = await this.#bookmarksCURD.addBookmark(newBookmark.title, newBookmark.url);
                        this.#bookmarksCURD.moveBookmark(insertBookmark.id, find.parentId, find.index + 1);
                    } else {
                        await this.#bookmarksCURD.addBookmark(newBookmark.title, newBookmark.url, newBookmark.parentId);
                    }
                }
            }
        }
    }

    /**
     * 获取导入进度百分数
     * @returns {number}
     */
    getImportRate() {
        return this.#importingBookmarkCount / this.#newBookmarkList.length;
    }

    /**
     * 清空所有书签
     * @returns {Promise}
     */
    async clearBookmarks() {
        for (let i = 0; i < this.#bookmarkList.length; i++) {
            let v = this.#bookmarkList[i];
            this.#clearingBookmarkCount++;
            this.dispatchEvent(new Event('clear'));
            if (this.isRootGroup(v)) continue;
            if (this.isGroup(v)) {
                await this.#bookmarksCURD.deleteBookmarkGroup(v.id);
            } else {
                await this.#bookmarksCURD.deleteBookmark(v.id);
            }
        }
        await this.init();
    }

    /**
     * 获取清空百分比
     * @returns {number}
     */
    getClearRate() {
        return this.#clearingBookmarkCount / this.#bookmarkList.length;
    }

    /**
     * 书签去重
     * @returns {Promise}
     */
    async deleteRepeatBookmarks() {
        for (let [url, bookmarkList] of this.#repeatBookmarkMap) {
            if (bookmarkList.length > 1) {

                // 根据title分组
                let titleGroupList = [];
                for (let bookmark of bookmarkList) {
                    let find = titleGroupList.find(titleGroup => titleGroup.title === bookmark.title)
                    if (find) {
                        find.idList.push(bookmark.id);
                    } else {
                        titleGroupList.push({
                            title: bookmark.title,
                            idList: [bookmark.id]
                        })
                    }
                }

                for (let titleGroup of titleGroupList) {
                    if (titleGroup.idList.length > 1) {

                        // 索引从1开始，保证每个不同的标题的书签都保留第一个
                        for (let i = 1; i < titleGroup.idList.length; i++) {
                            let id = titleGroup.idList[i];
                            this.#needDeleteBookmarks.push(id);
                        }
                    }
                }
            }
        }
        
        for(let id of this.#needDeleteBookmarks) {
            this.#deleteingRepeatBookmarkCount++;
            this.dispatchEvent(new Event('deleteRepeat'));
            await this.#bookmarksCURD.deleteBookmark(id);
        }
        await this.init();
    }

    /**
     * 获取去重百分比
     * @returns {number}
     */
    getDeleteRepeatRate() {
        return this.#deleteingRepeatBookmarkCount / this.#needDeleteBookmarks.length
    }
}