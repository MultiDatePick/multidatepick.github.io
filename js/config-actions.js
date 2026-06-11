/* ═══════════════════════════════════════════════════
   Config Library — Copy JSON & Flow XML Generation
   ═══════════════════════════════════════════════════ */

(function () {

    /* ── Toast ── */
    function showToast(title, message, duration) {
        let container = document.getElementById('mdp-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'mdp-toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = 'mdp-toast';
        toast.innerHTML =
            '<div class="mdp-toast-title">' + title + '</div>' +
            '<div class="mdp-toast-body">' + message + '</div>';
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('visible'));
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, duration || 6000);
    }

    /* ── Copy JSON ── */
    function handleCopyJson(e) {
        e.preventDefault();
        const card = e.target.closest('.config-card');
        const configFile = card.dataset.configFile;
        fetch('downloads/configs/' + configFile)
            .then(function (r) { return r.text(); })
            .then(function (json) {
                return navigator.clipboard.writeText(json);
            })
            .then(function () {
                showToast(
                    'JSON Copied',
                    'Open your Salesforce org and navigate to the <strong>MultiDatePick Setup</strong> app. ' +
                    'Go to the <strong>Import</strong> tab and paste the JSON to deploy this configuration instantly.'
                );
            })
            .catch(function () {
                showToast('Copy Failed', 'Your browser blocked clipboard access. Try right-clicking the button and using "Copy link address" instead.', 5000);
            });
    }

    /* ── Flow XML Generation ── */

    function getComponentType(card) {
        var badge = card.querySelector('.config-badge');
        if (!badge) return 'Dates';
        // Normalize: lowercase + collapse whitespace so "Date Time", "DateTime",
        // and "datetime" all match. Without the whitespace strip, the 9 badges
        // that read "Date Time" (with a space) fell through to "Dates" and
        // generated a Dates-only Flow XML for every DateTime config.
        var text = badge.textContent.trim().toLowerCase().replace(/\s+/g, '');
        if (text === 'booking') return 'Booking';
        if (text === 'datetime') return 'DateTime';
        return 'Dates';
    }

    function getConfigName(card) {
        return (card.dataset.configFile || 'Config').replace('.json', '').replace(/_/g, ' ');
    }

    function getConfigApiName(card) {
        return (card.dataset.configFile || 'Config').replace('.json', '');
    }

    function xmlEscape(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function buildFlowXml(configData, componentType, configName) {
        var apiName = configName.replace(/[^A-Za-z0-9_]/g, '_');
        var flowLabel = configName.replace(/_/g, ' ');
        var extensionName = componentType === 'Booking' ? 'c:multiDatePickBooking'
                          : componentType === 'DateTime' ? 'c:multiDatePickDateTime'
                          : 'c:multiDatePickDates';

        var inputParams = buildInputParams(configData, componentType);

        if (componentType === 'Booking') {
            return buildBookingFlow(apiName, flowLabel, extensionName, inputParams, configData);
        }
        return buildDatesOrDateTimeFlow(apiName, flowLabel, extensionName, inputParams, configData, componentType);
    }

    function buildInputParams(cfg, componentType) {
        var lines = [];

        function addString(name, value) {
            if (value != null && value !== '') {
                lines.push(
                    '            <inputParameters>\n' +
                    '                <name>' + name + '</name>\n' +
                    '                <value><stringValue>' + xmlEscape(value) + '</stringValue></value>\n' +
                    '            </inputParameters>'
                );
            }
        }
        function addBool(name, value) {
            if (value != null) {
                lines.push(
                    '            <inputParameters>\n' +
                    '                <name>' + name + '</name>\n' +
                    '                <value><booleanValue>' + (value ? 'true' : 'false') + '</booleanValue></value>\n' +
                    '            </inputParameters>'
                );
            }
        }
        function addNumber(name, value) {
            if (value != null) {
                lines.push(
                    '            <inputParameters>\n' +
                    '                <name>' + name + '</name>\n' +
                    '                <value><numberValue>' + value + '.0</numberValue></value>\n' +
                    '            </inputParameters>'
                );
            }
        }

        // Shared display props
        addString('label', cfg.label || cfg.Modal_Title__c);
        addString('modalTitle', cfg.Modal_Title__c);
        addString('calendarSize', cfg.Calendar_Size__c);
        addString('dayHeaderFormat', cfg.Day_Header_Format__c);
        addBool('twoMonthView', cfg.Two_Month_View__c);
        addBool('showRecurringPattern', cfg.Show_Recurring_Pattern__c);
        addBool('showSelectedSummary', cfg.Show_Selected_Summary__c);
        addBool('allowPastDates', cfg.Allow_Past_Dates__c);
        addBool('weekStartsOnMonday', cfg.Week_Starts_On_Monday__c);
        addBool('autoJumpToFirstAvailable', cfg.Auto_Jump_To_First_Available__c);
        addNumber('maxSelections', cfg.Max_Selections__c);
        addString('endDateField', cfg.End_Date_Field__c);
        addString('minDate', cfg.Min_Date__c);
        addString('maxDate', cfg.Max_Date__c);
        addBool('preloadExistingDates', cfg.Preload_Existing_Dates__c);
        addString('preloadMode', cfg.Preload_Mode__c);
        addString('saveButtonLabel', cfg.Save_Button_Label__c);
        addString('editButtonLabel', cfg.Edit_Button_Label__c);
        addString('editRecordDisplay', cfg.Edit_Record_Display__c);
        addString('statusFieldLabel', cfg.Status_Field_Label__c);
        addString('blockedDatesSourceObject', cfg.Blocked_Dates_Source_Object__c);
        addString('blockedDatesDateField', cfg.Blocked_Dates_Date_Field__c);
        addString('blockedDatesFilterField', cfg.Blocked_Dates_Filter_Field__c);

        // DateTime / Booking shared time props
        if (componentType === 'DateTime' || componentType === 'Booking') {
            addNumber('timeInterval', cfg.Time_Interval__c);
            addBool('allowDifferentTimes', cfg.Allow_Different_Times__c);
            addBool('groupTimeSlotsByPeriod', cfg.Group_Time_Slots_By_Period__c);
            addBool('consolidateTimeSpan', cfg.Consolidate_Time_Span__c);
            addBool('appendDateTimeToName', cfg.Append_DateTime_To_Name__c);
        }

        // DateTime-only time props (Booking uses businessHoursStart/EndField on the
        // resource record, not these wrapper-level overrides)
        if (componentType === 'DateTime') {
            addString('minTime', cfg.Min_Time__c);
            addString('maxTime', cfg.Max_Time__c);
            addBool('enableEndTime', cfg.Enable_End_Time__c);
            addString('timeDisplayMode', cfg.Time_Display_Mode__c);
        }

        // Status / edit props
        addString('statusField', cfg.Status_Field__c);
        addString('statusColors', cfg.Booking_Status_Colors__c);
        addString('statusColorDisplay', cfg.Status_Color_Display__c);
        addBool('enableEditMode', cfg.Enable_Edit_Mode__c);
        addString('hideBookingsWithStatus', cfg.Hide_Bookings_With_Status__c);
        addString('conflictBehavior', cfg.Conflict_Behavior__c);
        addNumber('conflictLookAheadDays', cfg.Conflict_Look_Ahead_Days__c);

        // Booking-specific resource props
        if (componentType === 'Booking') {
            addString('resourceObjectApiName', cfg.Resource_Object__c);
            addString('resourceNameField', cfg.Resource_Name_Field__c);
            addString('businessHoursStartField', cfg.Business_Hours_Start_Field__c);
            addString('businessHoursEndField', cfg.Business_Hours_End_Field__c);
            addString('bookingResourceField', cfg.Booking_Resource_Field__c);
            addString('capacityField', cfg.Capacity_Field__c);
            addBool('showAvailabilityCount', cfg.Show_Availability_Count__c);
            addBool('disableTimeSlotGrid', cfg.Disable_Time_Slot_Grid__c);
            addBool('allowMultipleResources', cfg.Allow_Multiple_Resources__c);
            addString('resourceFilterField', cfg.Resource_Filter_Field__c);
            addString('resourceFilterValue', cfg.Resource_Filter_Value__c);
            addString('capacityAggregation', cfg.Capacity_Aggregation__c);
            addString('resourceBookButtonLabel', cfg.Resource_Book_Button_Label__c);
        }

        // Sub-block (DateTime + Booking)
        if (componentType === 'DateTime' || componentType === 'Booking') {
            addString('subBlockObjectApiName', cfg.Sub_Block_Object_Api_Name__c);
            addString('subBlockParentLookupField', cfg.Sub_Block_Parent_Lookup_Field__c);
            addString('subBlockDateField', cfg.Sub_Block_Date_Field__c);
            addString('subBlockStartTimeField', cfg.Sub_Block_Start_Time_Field__c);
            addString('subBlockEndTimeField', cfg.Sub_Block_End_Time_Field__c);
            addString('subBlockNameField', cfg.Sub_Block_Name_Field__c);
            addString('subBlockModeButtonLabel', cfg.Sub_Block_Mode_Button_Label__c);
            addBool('showSubBlockButton', cfg.Show_Sub_Block_Button__c);
        }

        // Record name
        addString('recordNameField', cfg.Record_Name_Field__c);
        addString('defaultRecordName', cfg.Default_Record_Name__c);

        // JSON output — needed for Dates/DateTime flows
        if (componentType !== 'Booking') {
            addBool('outputAsJson', true);
        }

        return lines.join('\n');
    }

    /* ── Dates / DateTime Flow ── */
    function buildDatesOrDateTimeFlow(apiName, flowLabel, extensionName, inputParams, cfg, componentType) {
        var jsonOutputName = componentType === 'DateTime' ? 'selectedDatesWithTimesJson' : 'selectedDateRangesJson';
        var relObj = cfg.Related_Object__c || 'YOUR_OBJECT__c';
        var dateField = cfg.Date_Field__c || 'YOUR_DATE_FIELD__c';
        var relField = cfg.Relationship_Field__c || 'YOUR_LOOKUP_FIELD__c';
        var nameField = cfg.Record_Name_Field__c || '';
        var defaultName = cfg.Default_Record_Name__c || '';
        var startTimeField = cfg.Start_Time_Field__c || '';
        var endTimeField = cfg.End_Time_Field__c || '';
        var endDateField = cfg.End_Date_Field__c || '';

        var recordCreateInputs = '';
        recordCreateInputs +=
            '        <!-- >>> UPDATE: Change the field names below to match YOUR Salesforce object -->\n' +
            '        <inputAssignments>\n' +
            '            <field>' + xmlEscape(dateField) + '</field>\n' +
            '            <value><elementReference>Loop_Entries.fromDate</elementReference></value>\n' +
            '        </inputAssignments>';

        if (endDateField) {
            recordCreateInputs += '\n' +
            '        <inputAssignments>\n' +
            '            <field>' + xmlEscape(endDateField) + '</field>\n' +
            '            <value><elementReference>Loop_Entries.toDate</elementReference></value>\n' +
            '        </inputAssignments>';
        }

        if (componentType === 'DateTime' && startTimeField) {
            recordCreateInputs += '\n' +
            '        <inputAssignments>\n' +
            '            <field>' + xmlEscape(startTimeField) + '</field>\n' +
            '            <value><elementReference>Loop_Entries.startTime</elementReference></value>\n' +
            '        </inputAssignments>';
        }
        if (componentType === 'DateTime' && endTimeField) {
            recordCreateInputs += '\n' +
            '        <inputAssignments>\n' +
            '            <field>' + xmlEscape(endTimeField) + '</field>\n' +
            '            <value><elementReference>Loop_Entries.endTime</elementReference></value>\n' +
            '        </inputAssignments>';
        }

        if (nameField && defaultName) {
            recordCreateInputs += '\n' +
            '        <!-- >>> UPDATE: Record name field and value -->\n' +
            '        <inputAssignments>\n' +
            '            <field>' + xmlEscape(nameField) + '</field>\n' +
            '            <value><stringValue>' + xmlEscape(defaultName) + '</stringValue></value>\n' +
            '        </inputAssignments>';
        }

        recordCreateInputs += '\n' +
            '        <!-- >>> UPDATE: Change this lookup field to link records to the parent -->\n' +
            '        <!--\n' +
            '        <inputAssignments>\n' +
            '            <field>' + xmlEscape(relField) + '</field>\n' +
            '            <value><elementReference>PARENT_RECORD_ID_VARIABLE</elementReference></value>\n' +
            '        </inputAssignments>\n' +
            '        -->';

        return '<?xml version="1.0" encoding="UTF-8"?>\n' +
'<Flow xmlns="http://soap.sforce.com/2006/04/metadata">\n' +
'    <apiVersion>63.0</apiVersion>\n' +
'    <description>Starter Flow for ' + xmlEscape(flowLabel) + '. This Flow was generated by the MultiDatePick Config Library. Open it in Flow Builder, update the object and field names to match your org, then activate.</description>\n' +
'    <label>' + xmlEscape(flowLabel) + '</label>\n' +
'    <processMetadataValues>\n' +
'        <name>BuilderType</name>\n' +
'        <value><stringValue>LightningFlowBuilder</stringValue></value>\n' +
'    </processMetadataValues>\n' +
'    <processMetadataValues>\n' +
'        <name>CanvasMode</name>\n' +
'        <value><stringValue>AUTO_LAYOUT_CANVAS</stringValue></value>\n' +
'    </processMetadataValues>\n' +
'    <processType>Flow</processType>\n' +
'    <status>Draft</status>\n' +
'\n' +
'    <start>\n' +
'        <locationX>50</locationX>\n' +
'        <locationY>0</locationY>\n' +
'        <connector>\n' +
'            <targetReference>Screen_Main</targetReference>\n' +
'        </connector>\n' +
'    </start>\n' +
'\n' +
'    <!-- ═══════════════════════════════════════════════════════\n' +
'         VARIABLES\n' +
'         ═══════════════════════════════════════════════════════ -->\n' +
'\n' +
'    <variables>\n' +
'        <name>varJsonOutput</name>\n' +
'        <dataType>String</dataType>\n' +
'        <isCollection>false</isCollection>\n' +
'        <isInput>false</isInput>\n' +
'        <isOutput>false</isOutput>\n' +
'    </variables>\n' +
'\n' +
'    <variables>\n' +
'        <name>varParsedEntries</name>\n' +
'        <dataType>Apex</dataType>\n' +
'        <apexClass>MultiDatePickEntryCollection</apexClass>\n' +
'        <isCollection>false</isCollection>\n' +
'        <isInput>false</isInput>\n' +
'        <isOutput>false</isOutput>\n' +
'    </variables>\n' +
'\n' +
'    <!-- ═══════════════════════════════════════════════════════\n' +
'         SCREEN — Date Selection\n' +
'         The user picks dates (and times, if DateTime) on this screen.\n' +
'         ═══════════════════════════════════════════════════════ -->\n' +
'\n' +
'    <!-- All <screens> blocks must be contiguous (Flow XML schema requirement) -->\n' +
'    <screens>\n' +
'        <name>Screen_Main</name>\n' +
'        <label>' + xmlEscape(flowLabel) + '</label>\n' +
'        <locationX>176</locationX>\n' +
'        <locationY>158</locationY>\n' +
'        <connector>\n' +
'            <targetReference>Action_ParseDates</targetReference>\n' +
'        </connector>\n' +
'        <showHeader>false</showHeader>\n' +
'        <showFooter>true</showFooter>\n' +
'        <fields>\n' +
'            <name>DatePicker</name>\n' +
'            <extensionName>' + extensionName + '</extensionName>\n' +
'            <fieldType>ComponentInstance</fieldType>\n' +
inputParams + '\n' +
'            <isRequired>true</isRequired>\n' +
'            <outputParameters>\n' +
'                <assignToReference>varJsonOutput</assignToReference>\n' +
'                <name>' + jsonOutputName + '</name>\n' +
'            </outputParameters>\n' +
'        </fields>\n' +
'    </screens>\n' +
'\n' +
'    <screens>\n' +
'        <name>Screen_Done</name>\n' +
'        <label>Done</label>\n' +
'        <locationX>176</locationX>\n' +
'        <locationY>842</locationY>\n' +
'        <showHeader>false</showHeader>\n' +
'        <showFooter>true</showFooter>\n' +
'        <fields>\n' +
'            <name>txt_Success</name>\n' +
'            <fieldText>&lt;p&gt;&lt;b&gt;Your dates have been saved.&lt;/b&gt;&lt;/p&gt;</fieldText>\n' +
'            <fieldType>DisplayText</fieldType>\n' +
'        </fields>\n' +
'    </screens>\n' +
'\n' +
'    <!-- ═══════════════════════════════════════════════════════\n' +
'         ACTION — Parse JSON into loopable entries\n' +
'         This calls the MultiDatePickParser Apex action.\n' +
'         No changes needed here.\n' +
'         ═══════════════════════════════════════════════════════ -->\n' +
'\n' +
'    <actionCalls>\n' +
'        <name>Action_ParseDates</name>\n' +
'        <label>Parse Selected Dates</label>\n' +
'        <locationX>176</locationX>\n' +
'        <locationY>350</locationY>\n' +
'        <actionName>MultiDatePickParser</actionName>\n' +
'        <actionType>apex</actionType>\n' +
'        <connector>\n' +
'            <targetReference>Loop_Entries</targetReference>\n' +
'        </connector>\n' +
'        <inputParameters>\n' +
'            <name>jsonStrings</name>\n' +
'            <value><elementReference>varJsonOutput</elementReference></value>\n' +
'        </inputParameters>\n' +
'        <storeOutputAutomatically>true</storeOutputAutomatically>\n' +
'    </actionCalls>\n' +
'\n' +
'    <!-- ═══════════════════════════════════════════════════════\n' +
'         LOOP — Iterate through each parsed date entry\n' +
'         Each iteration creates one record.\n' +
'         ═══════════════════════════════════════════════════════ -->\n' +
'\n' +
'    <loops>\n' +
'        <name>Loop_Entries</name>\n' +
'        <label>Loop Through Date Entries</label>\n' +
'        <locationX>176</locationX>\n' +
'        <locationY>542</locationY>\n' +
'        <collectionReference>varParsedEntries.data</collectionReference>\n' +
'        <iterationOrder>Asc</iterationOrder>\n' +
'        <nextValueConnector>\n' +
'            <targetReference>Create_Record</targetReference>\n' +
'        </nextValueConnector>\n' +
'        <noMoreValuesConnector>\n' +
'            <targetReference>Screen_Done</targetReference>\n' +
'        </noMoreValuesConnector>\n' +
'    </loops>\n' +
'\n' +
'    <!-- ═══════════════════════════════════════════════════════\n' +
'         RECORD CREATE — Create one record per date entry\n' +
'         >>> UPDATE the object name and field mappings below\n' +
'         to match your Salesforce org.\n' +
'         ═══════════════════════════════════════════════════════ -->\n' +
'\n' +
'    <recordCreates>\n' +
'        <name>Create_Record</name>\n' +
'        <label>Create Record</label>\n' +
'        <locationX>264</locationX>\n' +
'        <locationY>650</locationY>\n' +
'        <connector>\n' +
'            <targetReference>Loop_Entries</targetReference>\n' +
'        </connector>\n' +
recordCreateInputs + '\n' +
'        <!-- >>> UPDATE: Change this to YOUR Salesforce object API name -->\n' +
'        <object>' + xmlEscape(relObj) + '</object>\n' +
'    </recordCreates>\n' +
'\n' +
'</Flow>';
    }

    /* ── Booking Flow ── */
    function buildBookingFlow(apiName, flowLabel, extensionName, inputParams, cfg) {
        var relObj = cfg.Related_Object__c || 'YOUR_BOOKING_OBJECT__c';
        var dateField = cfg.Date_Field__c || 'YOUR_DATE_FIELD__c';
        var relField = cfg.Relationship_Field__c || 'YOUR_LOOKUP_FIELD__c';
        var resObj = cfg.Resource_Object__c || 'YOUR_RESOURCE_OBJECT__c';
        var resField = cfg.Booking_Resource_Field__c || 'YOUR_RESOURCE_LOOKUP__c';

        return '<?xml version="1.0" encoding="UTF-8"?>\n' +
'<Flow xmlns="http://soap.sforce.com/2006/04/metadata">\n' +
'    <apiVersion>63.0</apiVersion>\n' +
'    <description>Starter Flow for ' + xmlEscape(flowLabel) + '. This Flow was generated by the MultiDatePick Config Library. The booking component handles record creation automatically — this Flow just provides the screen and a confirmation. Open in Flow Builder, update the resource and booking object/field names, then activate.</description>\n' +
'    <label>' + xmlEscape(flowLabel) + '</label>\n' +
'    <processMetadataValues>\n' +
'        <name>BuilderType</name>\n' +
'        <value><stringValue>LightningFlowBuilder</stringValue></value>\n' +
'    </processMetadataValues>\n' +
'    <processMetadataValues>\n' +
'        <name>CanvasMode</name>\n' +
'        <value><stringValue>AUTO_LAYOUT_CANVAS</stringValue></value>\n' +
'    </processMetadataValues>\n' +
'    <processType>Flow</processType>\n' +
'    <status>Draft</status>\n' +
'\n' +
'    <start>\n' +
'        <locationX>50</locationX>\n' +
'        <locationY>0</locationY>\n' +
'        <connector>\n' +
'            <targetReference>Screen_Booking</targetReference>\n' +
'        </connector>\n' +
'    </start>\n' +
'\n' +
'    <!-- ═══════════════════════════════════════════════════════\n' +
'         VARIABLES\n' +
'         ═══════════════════════════════════════════════════════ -->\n' +
'\n' +
'    <variables>\n' +
'        <name>varBookingSuccessCount</name>\n' +
'        <dataType>Number</dataType>\n' +
'        <scale>0</scale>\n' +
'        <isCollection>false</isCollection>\n' +
'        <isInput>false</isInput>\n' +
'        <isOutput>false</isOutput>\n' +
'        <value><numberValue>0.0</numberValue></value>\n' +
'    </variables>\n' +
'\n' +
'    <variables>\n' +
'        <name>varConflictDates</name>\n' +
'        <dataType>String</dataType>\n' +
'        <isCollection>true</isCollection>\n' +
'        <isInput>false</isInput>\n' +
'        <isOutput>false</isOutput>\n' +
'    </variables>\n' +
'\n' +
'    <!-- ═══════════════════════════════════════════════════════\n' +
'         SCREEN — Resource Booking\n' +
'         The user selects a resource, picks dates, chooses time\n' +
'         slots, and clicks Book. The component creates booking\n' +
'         records automatically via Apex — no loop or record\n' +
'         create needed.\n' +
'\n' +
'         >>> UPDATE: Change resourceObjectApiName, bookingResourceField,\n' +
'         and the related object/field properties below to match\n' +
'         your Salesforce org.\n' +
'         ═══════════════════════════════════════════════════════ -->\n' +
'\n' +
'    <!-- All <screens> blocks must be contiguous (Flow XML schema requirement) -->\n' +
'    <screens>\n' +
'        <name>Screen_Booking</name>\n' +
'        <label>' + xmlEscape(flowLabel) + '</label>\n' +
'        <locationX>176</locationX>\n' +
'        <locationY>158</locationY>\n' +
'        <connector>\n' +
'            <targetReference>Decision_CheckResult</targetReference>\n' +
'        </connector>\n' +
'        <showHeader>false</showHeader>\n' +
'        <showFooter>true</showFooter>\n' +
'        <fields>\n' +
'            <name>BookingPicker</name>\n' +
'            <extensionName>' + extensionName + '</extensionName>\n' +
'            <fieldType>ComponentInstance</fieldType>\n' +
'            <!-- >>> UPDATE: These properties configure the booking component.\n' +
'                 Change resourceObjectApiName and resourceBookingObject\n' +
'                 to match your Salesforce objects. -->\n' +
inputParams + '\n' +
'            <!-- >>> UPDATE: These tell the component which object to create booking records on -->\n' +
'            <inputParameters>\n' +
'                <name>resourceBookingObject</name>\n' +
'                <value><stringValue>' + xmlEscape(relObj) + '</stringValue></value>\n' +
'            </inputParameters>\n' +
'            <inputParameters>\n' +
'                <name>bookingDateField</name>\n' +
'                <value><stringValue>' + xmlEscape(dateField) + '</stringValue></value>\n' +
'            </inputParameters>\n' +
'            <inputParameters>\n' +
'                <name>bookingResourceField</name>\n' +
'                <value><stringValue>' + xmlEscape(resField) + '</stringValue></value>\n' +
'            </inputParameters>\n' +
'            <inputParameters>\n' +
'                <name>bookingStartTimeField</name>\n' +
'                <value><stringValue>' + xmlEscape(cfg.Start_Time_Field__c || 'Start_Time__c') + '</stringValue></value>\n' +
'            </inputParameters>\n' +
'            <inputParameters>\n' +
'                <name>bookingEndTimeField</name>\n' +
'                <value><stringValue>' + xmlEscape(cfg.End_Time_Field__c || 'End_Time__c') + '</stringValue></value>\n' +
'            </inputParameters>\n' +
'            <isRequired>true</isRequired>\n' +
'            <outputParameters>\n' +
'                <assignToReference>varBookingSuccessCount</assignToReference>\n' +
'                <name>bookingSuccessCount</name>\n' +
'            </outputParameters>\n' +
'            <outputParameters>\n' +
'                <assignToReference>varConflictDates</assignToReference>\n' +
'                <name>bookingConflictDates</name>\n' +
'            </outputParameters>\n' +
'        </fields>\n' +
'    </screens>\n' +
'\n' +
'    <screens>\n' +
'        <name>Screen_Success</name>\n' +
'        <label>Booking Confirmed</label>\n' +
'        <locationX>88</locationX>\n' +
'        <locationY>542</locationY>\n' +
'        <showHeader>false</showHeader>\n' +
'        <showFooter>true</showFooter>\n' +
'        <fields>\n' +
'            <name>txt_Success</name>\n' +
'            <fieldText>&lt;p&gt;&lt;b&gt;Booking confirmed!&lt;/b&gt;&lt;/p&gt;&lt;p&gt;Your resource has been booked successfully.&lt;/p&gt;</fieldText>\n' +
'            <fieldType>DisplayText</fieldType>\n' +
'        </fields>\n' +
'    </screens>\n' +
'\n' +
'    <screens>\n' +
'        <name>Screen_NoBookings</name>\n' +
'        <label>No Bookings Made</label>\n' +
'        <locationX>264</locationX>\n' +
'        <locationY>542</locationY>\n' +
'        <showHeader>false</showHeader>\n' +
'        <showFooter>true</showFooter>\n' +
'        <fields>\n' +
'            <name>txt_NoBookings</name>\n' +
'            <fieldText>&lt;p&gt;No bookings were created. This may be due to time slot conflicts. Please try again with different dates or times.&lt;/p&gt;</fieldText>\n' +
'            <fieldType>DisplayText</fieldType>\n' +
'        </fields>\n' +
'    </screens>\n' +
'\n' +
'    <!-- ═══════════════════════════════════════════════════════\n' +
'         DECISION — Did bookings succeed?\n' +
'         ═══════════════════════════════════════════════════════ -->\n' +
'\n' +
'    <decisions>\n' +
'        <name>Decision_CheckResult</name>\n' +
'        <label>Check Booking Result</label>\n' +
'        <locationX>176</locationX>\n' +
'        <locationY>350</locationY>\n' +
'        <defaultConnector>\n' +
'            <targetReference>Screen_NoBookings</targetReference>\n' +
'        </defaultConnector>\n' +
'        <defaultConnectorLabel>No Bookings</defaultConnectorLabel>\n' +
'        <rules>\n' +
'            <name>rule_HasBookings</name>\n' +
'            <conditionLogic>and</conditionLogic>\n' +
'            <conditions>\n' +
'                <leftValueReference>varBookingSuccessCount</leftValueReference>\n' +
'                <operator>GreaterThan</operator>\n' +
'                <rightValue><numberValue>0.0</numberValue></rightValue>\n' +
'            </conditions>\n' +
'            <connector>\n' +
'                <targetReference>Screen_Success</targetReference>\n' +
'            </connector>\n' +
'            <label>Has Bookings</label>\n' +
'        </rules>\n' +
'    </decisions>\n' +
'\n' +
'</Flow>';
    }

    /* ── Copy Flow XML ── */
    function handleCopyFlowXml(e) {
        e.preventDefault();
        var card = e.target.closest('.config-card');
        var configFile = card.dataset.configFile;
        var componentType = getComponentType(card);
        var configName = getConfigApiName(card);

        fetch('downloads/configs/' + configFile)
            .then(function (r) { return r.json(); })
            .then(function (cfg) {
                var xml = buildFlowXml(cfg, componentType, configName);
                return navigator.clipboard.writeText(xml).then(function () { return xml; });
            })
            .then(function () {
                showToast(
                    'Flow XML Copied',
                    'You\'ll deploy this XML to your org with VS Code + the Salesforce CLI.<br>' +
                    '<a href="/deploy-flow-vscode.html" target="_blank" rel="noopener">&rarr; Full step-by-step: Deploy a Flow from VS Code</a><br><br>' +
                    '<strong>Quick version:</strong><br>' +
                    '<strong>1.</strong> Create <code>force-app/main/default/flows/' + configName + '.flow-meta.xml</code><br>' +
                    '<strong>2.</strong> Paste the XML and save<br>' +
                    '<strong>3.</strong> Deploy: <code>sf project deploy start --source-dir force-app/main/default/flows/' + configName + '.flow-meta.xml</code><br>' +
                    '<strong>4.</strong> In Flow Builder, update the lines marked <strong>&gt;&gt;&gt; UPDATE</strong> to match your org',
                    15000
                );
            })
            .catch(function () {
                showToast('Copy Failed', 'Your browser blocked clipboard access. Try again or check browser permissions.', 5000);
            });
    }

    /* ── Attach handlers ── */
    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('.btn-copy-json').forEach(function (btn) {
            btn.addEventListener('click', handleCopyJson);
        });
        document.querySelectorAll('.btn-copy-flow').forEach(function (btn) {
            btn.addEventListener('click', handleCopyFlowXml);
        });
    });

})();
