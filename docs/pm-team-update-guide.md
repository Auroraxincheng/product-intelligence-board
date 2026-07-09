# PM Team Quick Guide: How to Add Weekly Updates

Copy this into Lark as a lightweight team instruction.

## 1. Login

Choose `pm_team`, select your PM account, then enter the passcode.

After login, the board is shared: you can see all product areas and all PM updates, not only your own.

## 2. Pick the Week First

Top-right `Reporting Week` controls which week you are reviewing.

Flow:

`Reporting Week` -> choose week -> board refreshes -> update cards show that week's latest progress

Important:

- Weekly update defaults to the selected reporting week.
- If you are updating this week, check the week before submitting.
- Old weeks stay historical. Updating W29 will not rewrite W28.

## 3. Add Weekly Update

Use the blue button:

`Add Weekly Update`

This is for adding progress to an existing Update Item.

Selection flow:

`Product Area` -> `Segment` -> `Track / Category` -> `Product / Workstream` -> `Update Item`

After you select an Update Item, the form shows the item information so you can confirm you are updating the right thing.

Then fill only the weekly update fields:

- `Progress this week`: optional, but recommended
- `Next step`: optional, but recommended
- `Status at update time`: required
- `Blocker / Delay`: only required when status is `Blocked` or `Delay`
- `Related links`: optional

Submit creates a new weekly entry. It does not overwrite previous weekly updates.

## 4. Create New Update Item

Use the white button:

`Create New Update Item`

Use this only when the product/workstream or update item does not exist yet.

Creation flow:

`Classification` -> `Product / Workstream` -> `Update Item Details`

Example:

`CBI` -> `B2B` -> `POC & Customer Support` -> `Polaris` -> `Polaris - BAF Access Preparation`

Important:

- `Product / Workstream` is the bigger bucket, like Polaris or Data Partner.
- `Update Item` is the specific thing being tracked, like BAF Access Preparation.
- Owner defaults to your PM profile, but can be changed if needed.
- Target completion date is required.

## 5. Timeline

Use `Timeline` on any card to see history.

Timeline shows every weekly update entry under that item:

`Week` -> `Submitted by` -> `Status` -> `Progress` -> `Next step` -> `Blocker / Delay`

Important:

- Multiple updates in the same week are allowed.
- Done/Archived items still keep their timeline.
- If something looks missing on the board, check Timeline first.

## 6. Done, Blocked, Delay

Status behavior:

- `Done`: appears in the week it was marked Done, then hides from future weeks by default.
- `Blocked` / `Delay`: write the reason in `Blocker / Delay`.
- Historical weeks do not change when you update a future week.

## 7. Where to Click

Suggested screenshots for Lark:

1. Dashboard top-right week selector  
   Arrow label: `Step 1: choose reporting week first`

2. Blue `Add Weekly Update` button  
   Arrow label: `Use this for weekly progress on an existing item`

3. White `Create New Update Item` button  
   Arrow label: `Only use this if the item does not exist yet`

4. Card-level `Add Update` button  
   Arrow label: `Fast path: update this exact item directly`

5. `Timeline` button  
   Arrow label: `Check historical updates here`

## Tiny Rule of Thumb

If the item already exists: use `Add Weekly Update`.

If the item does not exist: use `Create New Update Item`.

If unsure: search/filter first, then create only if you cannot find it.
