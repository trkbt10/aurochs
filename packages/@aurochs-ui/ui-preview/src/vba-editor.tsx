/**
 * @file Standalone entry point for the VBA Editor preview.
 *
 * Shows the VbaEditor component with sample VBA program.
 */

import { StrictMode, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { injectCSSVariables } from "@aurochs-ui/ui-components/design-tokens";
import { VbaEditor } from "@aurochs-ui/vba-editor";
import type { VbaProgramIr, VbaModule } from "@aurochs-office/vba";

injectCSSVariables();

// =============================================================================
// Sample VBA Modules
// =============================================================================

const module1Source = `'===============================================
' Module1 - Sample Standard Module
'===============================================

Option Explicit

' Public constant
Public Const APP_NAME As String = "Sample VBA Application"

' Module-level variable
Private mCounter As Long

'-----------------------------------------------
' Main entry point
'-----------------------------------------------
Public Sub Main()
    Dim message As String

    mCounter = 0
    message = "Hello from " & APP_NAME

    MsgBox message, vbInformation, "Welcome"

    Call ProcessItems
End Sub

'-----------------------------------------------
' Process items in a loop
'-----------------------------------------------
Private Sub ProcessItems()
    Dim i As Integer
    Dim total As Double

    total = 0

    For i = 1 To 10
        total = total + CalculateValue(i)
        mCounter = mCounter + 1
    Next i

    Debug.Print "Total: " & CStr(total)
    Debug.Print "Processed " & CStr(mCounter) & " items"
End Sub

'-----------------------------------------------
' Calculate value based on input
'-----------------------------------------------
Private Function CalculateValue(ByVal n As Integer) As Double
    If n Mod 2 = 0 Then
        CalculateValue = n * 1.5
    Else
        CalculateValue = n * 2.0
    End If
End Function
`;

const classModuleSource = `'===============================================
' Person - Sample Class Module
'===============================================

Option Explicit

' Private member variables
Private mFirstName As String
Private mLastName As String
Private mAge As Integer

'-----------------------------------------------
' Properties
'-----------------------------------------------
Public Property Get FirstName() As String
    FirstName = mFirstName
End Property

Public Property Let FirstName(ByVal value As String)
    mFirstName = value
End Property

Public Property Get LastName() As String
    LastName = mLastName
End Property

Public Property Let LastName(ByVal value As String)
    mLastName = value
End Property

Public Property Get Age() As Integer
    Age = mAge
End Property

Public Property Let Age(ByVal value As Integer)
    If value >= 0 And value <= 150 Then
        mAge = value
    Else
        Err.Raise vbObjectError + 1, "Person", "Invalid age"
    End If
End Property

Public Property Get FullName() As String
    FullName = mFirstName & " " & mLastName
End Property

'-----------------------------------------------
' Methods
'-----------------------------------------------
Public Sub Initialize(firstName As String, lastName As String, age As Integer)
    Me.FirstName = firstName
    Me.LastName = lastName
    Me.Age = age
End Sub

Public Function ToString() As String
    ToString = FullName & " (Age: " & CStr(mAge) & ")"
End Function
`;

const thisWorkbookSource = `'===============================================
' ThisWorkbook - Document Module
'===============================================

Option Explicit

Private Sub Workbook_Open()
    ' Called when the workbook is opened
    Debug.Print "Workbook opened at " & Now
    Call Module1.Main
End Sub

Private Sub Workbook_BeforeClose(Cancel As Boolean)
    ' Called before the workbook closes
    Dim response As Integer

    response = MsgBox("Are you sure you want to close?", vbYesNo + vbQuestion)

    If response = vbNo Then
        Cancel = True
    End If
End Sub

Private Sub Workbook_SheetChange(ByVal Sh As Object, ByVal Target As Range)
    ' Called when any cell is changed
    Debug.Print "Cell changed: " & Target.Address & " on " & Sh.Name
End Sub
`;

// =============================================================================
// Sample Program
// =============================================================================

const module1: VbaModule = {
  name: "Module1",
  type: "standard",
  sourceCode: module1Source,
  streamOffset: 0,
  procedures: [
    {
      name: "Main",
      type: "sub",
      visibility: "public",
      parameters: [],
      returnType: null,
    },
    {
      name: "ProcessItems",
      type: "sub",
      visibility: "private",
      parameters: [],
      returnType: null,
    },
    {
      name: "CalculateValue",
      type: "function",
      visibility: "private",
      parameters: [
        {
          name: "n",
          type: "Integer",
          passingMode: "byVal",
          isOptional: false,
          defaultValue: null,
          isParamArray: false,
        },
      ],
      returnType: "Double",
    },
  ],
};

const personClass: VbaModule = {
  name: "Person",
  type: "class",
  sourceCode: classModuleSource,
  streamOffset: 1000,
  procedures: [
    {
      name: "FirstName",
      type: "propertyGet",
      visibility: "public",
      parameters: [],
      returnType: "String",
    },
    {
      name: "FirstName",
      type: "propertyLet",
      visibility: "public",
      parameters: [
        {
          name: "value",
          type: "String",
          passingMode: "byVal",
          isOptional: false,
          defaultValue: null,
          isParamArray: false,
        },
      ],
      returnType: null,
    },
    {
      name: "LastName",
      type: "propertyGet",
      visibility: "public",
      parameters: [],
      returnType: "String",
    },
    {
      name: "Age",
      type: "propertyGet",
      visibility: "public",
      parameters: [],
      returnType: "Integer",
    },
    {
      name: "FullName",
      type: "propertyGet",
      visibility: "public",
      parameters: [],
      returnType: "String",
    },
    {
      name: "Initialize",
      type: "sub",
      visibility: "public",
      parameters: [
        { name: "firstName", type: "String", passingMode: "byRef", isOptional: false, defaultValue: null, isParamArray: false },
        { name: "lastName", type: "String", passingMode: "byRef", isOptional: false, defaultValue: null, isParamArray: false },
        { name: "age", type: "Integer", passingMode: "byRef", isOptional: false, defaultValue: null, isParamArray: false },
      ],
      returnType: null,
    },
    {
      name: "ToString",
      type: "function",
      visibility: "public",
      parameters: [],
      returnType: "String",
    },
  ],
};

const thisWorkbook: VbaModule = {
  name: "ThisWorkbook",
  type: "document",
  sourceCode: thisWorkbookSource,
  streamOffset: 2000,
  procedures: [
    {
      name: "Workbook_Open",
      type: "sub",
      visibility: "private",
      parameters: [],
      returnType: null,
    },
    {
      name: "Workbook_BeforeClose",
      type: "sub",
      visibility: "private",
      parameters: [
        { name: "Cancel", type: "Boolean", passingMode: "byRef", isOptional: false, defaultValue: null, isParamArray: false },
      ],
      returnType: null,
    },
    {
      name: "Workbook_SheetChange",
      type: "sub",
      visibility: "private",
      parameters: [
        { name: "Sh", type: { userDefined: "Object" }, passingMode: "byVal", isOptional: false, defaultValue: null, isParamArray: false },
        { name: "Target", type: { userDefined: "Range" }, passingMode: "byVal", isOptional: false, defaultValue: null, isParamArray: false },
      ],
      returnType: null,
    },
  ],
};

const sampleProgram: VbaProgramIr = {
  project: {
    name: "SampleVBAProject",
    helpFile: null,
    helpContext: 0,
    constants: null,
    version: { major: 1, minor: 0 },
  },
  modules: [thisWorkbook, module1, personClass],
  references: [
    { name: "VBA", libId: "{000204EF-0000-0000-C000-000000000046}", type: "registered" },
    { name: "Excel", libId: "{00020813-0000-0000-C000-000000000046}", type: "registered" },
  ],
};

// =============================================================================
// Root Component
// =============================================================================

const containerStyle: CSSProperties = {
  width: "100vw",
  height: "100vh",
  display: "flex",
  flexDirection: "column",
};

/**
 * VBA Editor Preview App.
 */
function App() {
  return (
    <div style={containerStyle}>
      <VbaEditor
        program={sampleProgram}
        onProgramChange={(program) => {
          console.log("Program changed:", program);
        }}
      />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
