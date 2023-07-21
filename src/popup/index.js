// let
//     bookmarkTree = [],
//     bookmarkList = [],
//     repeatBookmarkMap = []

const CACHE_DELETED_BOOKMARKS = 'cacheDeletedBookmarks';

const $ = id => document.getElementById(id);
const gen = tagName => document.createElement(tagName);

const
    $repeatCount = $('repeatCount'),
    $bookmarksAllCount = $('bookmarksAllCount'),
    $bookmarksGroupAllCount = $('bookmarksGroupAllCount'),
    $bookmarksRepeatAllCount = $('bookmarksRepeatAllCount'),
    $clearBookmarksBtn = $('clearBookmarksBtn'),
    $importBookmarksInput = $('importBookmarksInput'),
    $clearProgreessing = $('clearProgreessing'),
    $importProgreessing = $('importProgreessing'),
    $deleteRepeatBtn = $('deleteRepeatBtn'),
    $deleteRepeatProgreessing = $('deleteRepeatProgreessing')

async function run() {
    const bookmarksBusiness = new BookmarksBusiness();
    await bookmarksBusiness.init();

    let
        bookmarkTree = bookmarksBusiness.getBookmarkTree(),
        bookmarkList = bookmarksBusiness.getBookmarkList(),
        repeatBookmarkMap = bookmarksBusiness.getRepeatBookmarkMap();

    console.log('书签节点树:', bookmarkTree);
    console.log('书签数组:', bookmarkList);
    console.log('书签根据URL分组:', repeatBookmarkMap);

    $bookmarksAllCount.innerText = bookmarksBusiness.getBookmarksAllCount();
    $bookmarksGroupAllCount.innerText = bookmarksBusiness.getBookmarksGroupAllCount();
    $bookmarksRepeatAllCount.innerText = bookmarksBusiness.getBookmarksRepeatAllCount();


    // 导入合并书签
    $importBookmarksInput.onchange = async ev => {
        let { files } = ev.target;
        for (let file of files) {
            let file = files[0];
            await bookmarksBusiness.importBookmarks(file);
        }
        alert('导入书签成功！');
        location.reload();
    }
    bookmarksBusiness.addEventListener('import', ev => {
        let rate = ev.target.getImportRate() * 100;
        $importProgreessing.children[0].style.width = `${rate}%`;
    })


    // 清空书签
    $clearBookmarksBtn.onclick = async ev => {
        if (!confirm('确定要清空所有书签和书签分组吗？')) return;

        // 把清空的书签做一份备份，以后可能需要用到
        window.localStorage.setItem(CACHE_DELETED_BOOKMARKS, JSON.stringify(bookmarkList));
        await bookmarksBusiness.clearBookmarks();
        alert('清空书签成功！');
        location.reload();
    }
    bookmarksBusiness.addEventListener('clear', ev => {
        let rate = ev.target.getClearRate() * 100;
        $clearProgreessing.children[0].style.width = `${rate}%`;
    })

    // 书签去重
    $deleteRepeatBtn.onclick = async ev => {
        await bookmarksBusiness.deleteRepeatBookmarks();
        alert('去重完毕！');
        location.reload();
    }
    bookmarksBusiness.addEventListener('deleteRepeat', ev => {
        let rate = ev.target.getDeleteRepeatRate() * 100;
        $deleteRepeatProgreessing.children[0].style.width = `${rate}%`;
    })
}

run();