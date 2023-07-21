/**
 * 书签插件基础增删改查类
 */
class BookmarksCURD {
    #bookmarksAPI;
    #defaultBookmarkGroup;
    
    constructor() {
        this.init();
    }

    /**
     * 初始化
     */
    init() {
        this.#bookmarksAPI = chrome.bookmarks;
        this.#defaultBookmarkGroup = '1'; // 默认根书签分组是“书签栏”
    }

    /**
     * 获取原始书签所有数据树结构
     * @returns {Promsie}
     */
    getBookmarkTree() {
        return new Promise((resolve, reject) => {
            try {
                this.#bookmarksAPI.getTree(resolve);
            } catch (err) {
                reject(err)
            }
        })
    }

    /**
     * 根据父节点id获取一层子书签
     * @param {string} parentId 父节点id
     * @returns {Promise}
     */
    getBookmarkChildrenByParentId(parentId = this.#defaultBookmarkGroup) {
        return new Promise((resolve, reject) => {
            try {
                this.#bookmarksAPI.getChildren(parentId, resolve);
            } catch (err) {
                reject(err)
            }
        })
    }

    /**
     * 根据父节点id获取其自身和下面所有层书签
     * @param {string} parentId 父节点id
     * @returns {Promise}
     */
    getBookmarkTreeByParentId(parentId = this.#defaultBookmarkGroup) {
        return new Promise((resolve, reject) => {
            try {
                this.#bookmarksAPI.getSubTree(parentId, resolve);
            } catch (err) {
                reject(err)
            }
        })
    }

    /**
     * 获取最近添加的指定个数的书签
     * @param {number} num 要获取书签的个数
     * @returns {Promise}
     */
    getRecentAddBookmarks(num) {
        return new Promise((resolve, reject) => {
            try {
                this.#bookmarksAPI.getRecent(num, resolve);
            } catch (err) {
                reject(err)
            }
        })
    }

    /**
     * 新增一个书签
     * @param {string} parentId 父节点id
     * @param {string} title 标题
     * @param {string} url 地址
     * @param {number} index 在父节点下的位置，从0开始
     * @returns {Promise}
     */
    addBookmark(title = '新书签', url = '', parentId = this.#defaultBookmarkGroup, index) {
        return new Promise((resolve, reject) => {
            try {
                this.#bookmarksAPI.create({
                    parentId,
                    title,
                    url,
                    index
                }, resolve)
            } catch (err) {
                reject(err)
            }
        })
    }

    /**
     * 新建书签分组
     * @param {string} parentId 父节点id
     * @param {string} title 标题
     * @param {number} index 在父节点下的位置，从0开始
     * @returns {Promise}
     */
    addBookmarkGroup(title = '新分组', parentId = this.#defaultBookmarkGroup, index) {
        return new Promise((resolve, reject) => {
            try {
                this.#bookmarksAPI.create({
                    parentId,
                    title,
                    index
                }, resolve)
            } catch (err) {
                reject(err)
            }
        })
    }

    /**
     * 通过书签id更新书签
     * @param {string} id 书签id
     * @param {string} title 标题
     * @param {string} url 地址
     * @returns {Promise}
     */
    updateBookmark(id, title, url) {
        return new Promise((resolve, reject) => {
            try {
                this.#bookmarksAPI.update(id, {
                    title,
                    url,
                }, resolve)
            } catch (err) {
                reject(err)
            }
        })
    }

    /**
     * 通过书签id移动书签
     * @param {string} id 书签id
     * @param {string} parentId 父节点id
     * @param {number} index 在父节点下的位置，从0开始，默认在最后
     * @returns 
     */
    moveBookmark(id, parentId = this.#defaultBookmarkGroup, index) {
        return new Promise((resolve, reject) => {
            try {
                this.#bookmarksAPI.move(id, {
                    parentId,
                    index,
                }, resolve)
            } catch (err) {
                reject(err)
            }
        })
    }

    /**
     * 通过书签id删除书签，也可以删除空的书签分组
     * @param {string} id 书签id或空书签分组id
     */
    deleteBookmark(id) {
        return new Promise((resolve, reject) => {
            try {
                this.#bookmarksAPI.remove(id, resolve)
            } catch (err) {
                reject(err)
            }
        })
    }

    /**
     * 通过书签分组id删除非空书签分组
     * @param {string} id 书签分组id
     */
    deleteBookmarkGroup(id) {
        return new Promise((resolve, reject) => {
            try {
                this.#bookmarksAPI.removeTree(id, resolve)
            } catch (err) {
                reject(err)
            }
        })
    }
}